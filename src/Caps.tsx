import * as THREE from 'three'
import { useRef, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react'
import { useFrame, useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import type { GLTF } from 'three-stdlib'
import type { ThreeElements } from '@react-three/fiber'
import { MeshStandardNodeMaterial } from 'three/webgpu'
import { color, mix, uniform } from 'three/tsl'
import { useGameStore } from './store'
import { VFXEmitter } from './components/VFXParticles'
import { slashFlipX } from './components/particles/slash'

// ============================================================================
// Types
// ============================================================================

type ActionName = 'attack01' | 'attack02' | 'spin-attack' | 'stance'

type GLTFResult = GLTF & {
  nodes: {
    Cylinder: THREE.SkinnedMesh
    Sphere001: THREE.SkinnedMesh
    Sphere001_1: THREE.SkinnedMesh
    body: THREE.Bone
  }
  materials: {
    ['Material.002']: THREE.MeshStandardMaterial
    ['Material.001']: THREE.MeshStandardMaterial
  }
  animations: THREE.AnimationClip[]
}

export type CapsHandle = {
  onMouseDown: () => void
  onMouseUp: () => void
}

// ============================================================================
// Constants
// ============================================================================

const ATTACK_SPEED = 3
const SPIN_ATTACK_SPEED = 1.5
const CHARGE_DELAY_MS = 200  // Time before stance/charging starts
const CHARGE_TIME_MS = 600   // Time to fully charge after stance starts

// ============================================================================
// Component
// ============================================================================

export const Caps = forwardRef<CapsHandle, ThreeElements['group']>((props, ref) => {
  const group = useRef<THREE.Group>(null)
  const swordRef = useRef<THREE.SkinnedMesh>(null)
  const swordRef2 = useRef<THREE.Group>(null)
  const swordBoneRef = useRef<THREE.Bone | null>(null)
  const target = useRef<THREE.Mesh>(null)
  const setTarget = useGameStore((s) => s.setTarget)
  const slashEmitterRef = useRef<{ emit: (overrides?: Record<string, unknown>) => void } | null>(null)
  const sparkEmitterRef = useRef<{ emit: (overrides?: Record<string, unknown>) => void } | null>(null)

  // GLTF & Animations
  const { scene, animations } = useGLTF('/caps.glb')
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes } = useGraph(clone) as unknown as GLTFResult
  const { actions, mixer } = useAnimations(animations, group)

  // Store actions
  const setIsCharging = useGameStore((s) => s.setIsCharging)
  const setSpinAttacking = useGameStore((s) => s.setSpinAttacking)
  const triggerSpinAttack = useGameStore((s) => s.triggerSpinAttack)
  const triggerAttackDash = useGameStore((s) => s.triggerAttackDash)


  // Animation state - simple and clear
  const state = useRef({
    currentAnimation: 'stance' as ActionName,
    nextAttack: 'attack01' as 'attack01' | 'attack02',
    isAttacking: false,
    isHolding: false,
    holdStartTime: 0,
    chargeProgress: 0,
    isInChargeStance: false,  // True once we've transitioned to stance for charging
  })

  // Glow uniform ref
  const glowUniformRef = useRef<ReturnType<typeof uniform<number>> | null>(null)

  // ---------------------------------------------------------------------------
  // Attack System
  // ---------------------------------------------------------------------------

  const executeAttack = (attackName: 'attack01' | 'attack02') => {
    const s = state.current
    const action = actions[attackName]
    if (!action) return

    // Fade out current, play attack
    actions[s.currentAnimation]?.fadeOut(0.1)
    action.reset().fadeIn(0.1).play()
    action.setLoop(THREE.LoopOnce, 1)
    action.setEffectiveTimeScale(ATTACK_SPEED)
    action.clampWhenFinished = true

    s.isAttacking = true
    s.currentAnimation = attackName

    // Dash
    triggerAttackDash(1.2, 0.15)

    // Slash VFX - direction based on attack type
    slashFlipX.value = attackName === 'attack02' ? 0 : 1
    // setTimeout(() => {
    const direction = attackName === 'attack02' ? [[1, 1], [0, 0], [0, 0]] : [[-1, -1], [0, 0], [0, 0]]
    slashEmitterRef.current?.emit({ direction })
    // }, 100)

    // Alternate next attack
    s.nextAttack = attackName === 'attack01' ? 'attack02' : 'attack01'
  }

  const executeSpinAttack = () => {
    const s = state.current
    const action = actions['spin-attack']
    if (!action) return

    actions[s.currentAnimation]?.fadeOut(0.1)
    action.reset().fadeIn(0.1).play()
    action.setLoop(THREE.LoopOnce, 1)
    action.setEffectiveTimeScale(SPIN_ATTACK_SPEED)
    action.clampWhenFinished = true

    s.isAttacking = true
    s.currentAnimation = 'spin-attack'
    setSpinAttacking(true)
    triggerSpinAttack()
  }

  const enterChargeStance = () => {
    const s = state.current
    if (s.isInChargeStance) return

    actions[s.currentAnimation]?.fadeOut(0.1)
    actions['stance']?.reset().fadeIn(0.1).play()
    s.currentAnimation = 'stance'
    s.isInChargeStance = true
    setIsCharging(true)
  }

  const exitChargeStance = () => {
    const s = state.current
    s.isInChargeStance = false
    s.chargeProgress = 0
    setIsCharging(false)
  }

  // ---------------------------------------------------------------------------
  // Input Handlers
  // ---------------------------------------------------------------------------

  const onMouseDown = () => {
    const s = state.current

    // Ignore if already attacking
    // if (s.isAttacking) return

    s.isHolding = true
    s.holdStartTime = Date.now()
    // Don't start charging yet - wait for CHARGE_DELAY_MS (handled in useFrame)
  }

  const onMouseUp = () => {
    const s = state.current

    // Ignore if not holding or already attacking
    if (!s.isHolding) return
    if (s.isAttacking) {
      s.isHolding = false
      exitChargeStance()
      return
    }

    const wasInChargeStance = s.isInChargeStance
    s.isHolding = false
    exitChargeStance()

    // If we were charging and fully charged → spin attack
    if (wasInChargeStance && s.chargeProgress >= 1) {
      executeSpinAttack()
    } else {
      // Normal attack
      executeAttack(s.nextAttack)
    }
  }

  // ---------------------------------------------------------------------------
  // Animation Finished Handler
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const onFinished = (e: { action: THREE.AnimationAction }) => {
      const finishedName = e.action.getClip().name as ActionName
      const attackAnimations: ActionName[] = ['attack01', 'attack02', 'spin-attack']

      if (attackAnimations.includes(finishedName)) {
        state.current.isAttacking = false

        if (finishedName === 'spin-attack') {
          setSpinAttacking(false)
          // Only return to stance after spin attack
          actions[state.current.currentAnimation]?.fadeOut(0.1)
          actions['stance']?.reset().fadeIn(0.1).play()
          state.current.currentAnimation = 'stance'
        }
        // attack01/attack02 stay clamped at final frame
      }
    }

    mixer?.addEventListener('finished', onFinished)
    return () => mixer?.removeEventListener('finished', onFinished)
  }, [mixer, setSpinAttacking, actions])

  useImperativeHandle(ref, () => ({ onMouseDown, onMouseUp }), [])

  useEffect(() => {
    const action = actions['stance']?.reset().fadeIn(0.1).play()
    if (action) {
      state.current.currentAnimation = 'stance'
    }
  }, [actions])

  useFrame((_, delta) => {
    if (!glowUniformRef.current) return

    const s = state.current
    const currentGlow = glowUniformRef.current.value

    // Find sword bone once
    if (!swordBoneRef.current && swordRef.current?.skeleton) {
      const bones = swordRef.current.skeleton.bones
      swordBoneRef.current = bones.find(b => b.name === 'arm') || bones[bones.length - 1]
    }

    // Copy bone's world transform to swordRef2
    if (swordRef2.current && swordBoneRef.current && group.current) {
      group.current.updateMatrixWorld(true)
      const quaternion = swordBoneRef.current.quaternion.clone()
      swordRef2.current.quaternion.copy(quaternion)
    }

    // Charging logic
    if (s.isHolding && !s.isAttacking) {
      const holdDuration = Date.now() - s.holdStartTime

      // After CHARGE_DELAY_MS, enter charge stance
      if (holdDuration >= CHARGE_DELAY_MS && !s.isInChargeStance) {
        enterChargeStance()
      }

      // Once in charge stance, ramp up charge progress
      if (s.isInChargeStance) {
        const chargeTime = holdDuration - CHARGE_DELAY_MS
        s.chargeProgress = Math.min(1, chargeTime / CHARGE_TIME_MS)
        glowUniformRef.current.value = s.chargeProgress
      }
    } else if (s.isAttacking) {
      // Attacking: instant full glow
      glowUniformRef.current.value = 1
      const direction = s.nextAttack === 'attack02' ? [[1, 1], [-1, -1], [0, 0]] : [[-1, -1], [-1, -1], [0, 0]]
      sparkEmitterRef.current?.emit({ direction: direction })
    } else {
      // sparkEmitterRef.current?.stop()
      // Idle: fade out smoothly
      glowUniformRef.current.value = THREE.MathUtils.lerp(currentGlow, 0, delta * 12)
    }
  })

  useEffect(() => {
    setTarget(target.current)
  }, [target.current])

  const capsMaterial = useMemo(() => {
    const mat = new MeshStandardNodeMaterial()
    mat.roughness = 0.3
    mat.colorNode = color('#63acff')
    return mat
  }, [])

  const { swordMaterial, glowU } = useMemo(() => {
    const u = uniform(0)
    const mat = new MeshStandardNodeMaterial()
    const baseColor = color('#FCFBE6')
    const glowColor = color('#FF7139').mul(10)
    mat.colorNode = mix(baseColor, glowColor, u)
    return { swordMaterial: mat, glowU: u }
  }, [])

  // Store uniform ref
  useEffect(() => {
    glowUniformRef.current = glowU
  }, [glowU])

  // ---------------------------------------------------------------------------
  // Render-
  // ---------------------------------------------------------------------------

  return (
    <>
      <group ref={swordRef2}>
        <mesh ref={target} position={[0, -1.85, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.5, 1.7]} />
          <meshStandardMaterial color="red" visible={false} />
          <VFXEmitter
            name="sparks"
            ref={sparkEmitterRef}
            autoStart={false}
            position={[0, -.2, 0]}
            // autoStart={false}
            localDirection={true}
            emitCount={1}
          // delay={0.005}
          // direction={[[1, 1], [-1, -1], [0, 0]]}
          // startPosition={[[0, 0], [-1, 10], [0, 0]]}
          />
        </mesh>

      </group>
      <VFXEmitter
        name="slash"
        ref={slashEmitterRef}
        // autoStart={true}
        position={[0, 0, 0.6]}
        autoStart={false}
        localDirection={true}
        delay={1}
        direction={[[1, 1], [0, 0], [0, 0]]}
      />
      <group ref={group} {...props} dispose={null} scale={0.5} rotation={[0, Math.PI, 0]}>
        <group name="Scene">
          <group name="Armature">
            <primitive object={nodes.body} />
            <skinnedMesh
              name="Cylinder"
              geometry={nodes.Cylinder.geometry}
              material={capsMaterial}
              skeleton={nodes.Cylinder.skeleton}
              castShadow
              receiveShadow
            />
            <group name="Sphere">
              <skinnedMesh
                name="Sphere001"
                geometry={nodes.Sphere001.geometry}
                material={capsMaterial}
                skeleton={nodes.Sphere001.skeleton}
                castShadow
                receiveShadow
              />
              <skinnedMesh
                ref={swordRef}
                name="Sphere001_1"
                geometry={nodes.Sphere001_1.geometry}
                material={swordMaterial}
                skeleton={nodes.Sphere001_1.skeleton}
                castShadow
                receiveShadow
              />
            </group>
          </group>
        </group>
      </group >
    </>
  )
})

useGLTF.preload('/caps.glb')
