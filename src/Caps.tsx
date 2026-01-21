import * as THREE from 'three'
import { useRef, useEffect, useImperativeHandle, forwardRef, useMemo, useState } from 'react'
import { useFrame, useGraph } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import type { GLTF } from 'three-stdlib'
import type { ThreeElements } from '@react-three/fiber'
import { MeshStandardNodeMaterial } from 'three/webgpu'
import { color, mix, uniform } from 'three/tsl'
import { useGameStore } from './store'
import { useVFXEmitter } from './components/VFXParticles/VFXEmitter'
import { VFXEmitter } from './components/VFXParticles'

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

const ATTACK_SPEED = 3.5
const SPIN_ATTACK_SPEED = 1.5
const CHARGE_TIME_MS = 500

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
  const slashEmitterRef = useRef(null)

  // GLTF & Animations
  const { scene, animations } = useGLTF('/caps.glb')
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes } = useGraph(clone) as unknown as GLTFResult
  const { actions, mixer } = useAnimations(animations, group)

  // Store actions
  const setIsCharging = useGameStore((s) => s.setIsCharging)
  const setSpinAttacking = useGameStore((s) => s.setSpinAttacking)
  const triggerSpinAttack = useGameStore((s) => s.triggerSpinAttack)


  // Animation state refs
  const state = useRef({
    currentAnimation: 'stance' as ActionName,
    nextAttack: 'attack01' as 'attack01' | 'attack02',
    isAnimating: false,
    isHolding: false,
    isCharging: false,
    holdStartTime: 0,
    chargeProgress: 0,
    queuedAttack: false, // Buffer next attack during animation
  })

  // Glow uniform ref
  const glowUniformRef = useRef<ReturnType<typeof uniform<number>> | null>(null)

  // ---------------------------------------------------------------------------
  // Animation
  // ---------------------------------------------------------------------------

  const playAnimation = (name: ActionName, fadeIn = 0.1) => {
    const s = state.current
    if (s.currentAnimation === name && name !== 'stance') return
    if (s.isAnimating && name !== 'stance') return

    // Fade out current
    actions[s.currentAnimation]?.fadeOut(fadeIn)

    // Play new animation
    const action = actions[name]?.reset().fadeIn(fadeIn).play()
    if (!action) return

    // Configure attack animations
    if (name === 'attack01' || name === 'attack02') {
      if (group.current) {
        // Get world position and rotation
      }
      action.setLoop(THREE.LoopOnce, 1)
      action.setEffectiveTimeScale(ATTACK_SPEED)
      action.clampWhenFinished = true
      s.isAnimating = true
      setTimeout(() => {
        slashEmitterRef.current?.emit()
      }, 100)
    }

    if (name === 'spin-attack') {

      action.setLoop(THREE.LoopOnce, 1)
      action.setEffectiveTimeScale(SPIN_ATTACK_SPEED)
      action.clampWhenFinished = true
      s.isAnimating = true
      setSpinAttacking(true)
    }

    s.currentAnimation = name
  }

  const onMouseDown = () => {
    const s = state.current
    s.isHolding = true
    s.holdStartTime = Date.now()

    if (!s.isAnimating) {
      s.isCharging = true
      setIsCharging(true)
      playAnimation('stance', 0.1)
    }
  }

  const onMouseUp = () => {
    const s = state.current
    if (!s.isHolding) return

    s.isHolding = false
    const wasCharging = s.isCharging
    s.isCharging = false
    setIsCharging(false)

    const holdDuration = Date.now() - s.holdStartTime
    const isFullyCharged = holdDuration >= CHARGE_TIME_MS && wasCharging

    if (isFullyCharged) {
      triggerSpinAttack()
      playAnimation('spin-attack', 0.1)
    } else if (!s.isAnimating) {
      playAnimation(s.nextAttack, 0.1)
      s.nextAttack = s.nextAttack === 'attack01' ? 'attack02' : 'attack01'
    } else {
      s.queuedAttack = true
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
        const s = state.current
        s.isAnimating = false

        if (finishedName === 'spin-attack') {
          setSpinAttacking(false)
        }

        if (s.queuedAttack) {
          s.queuedAttack = false
          setTimeout(() => {
            if (!state.current.isAnimating) {
              const nextAnim = state.current.nextAttack
              state.current.nextAttack = nextAnim === 'attack01' ? 'attack02' : 'attack01'
              actions[nextAnim]?.reset().fadeIn(0.1).play()
              const action = actions[nextAnim]
              if (action) {
                action.setLoop(THREE.LoopOnce, 1)
                action.setEffectiveTimeScale(ATTACK_SPEED)
                action.clampWhenFinished = true
                state.current.isAnimating = true
                state.current.currentAnimation = nextAnim
              }
            }
          }, 0)
        }
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
      // Update entire hierarchy first
      group.current.updateMatrixWorld(true)

      // Now get the bone's world position/rotation

      const position = swordBoneRef.current.position.clone()
      const quaternion = swordBoneRef.current.quaternion.clone()

      // swordRef2.current.position.copy(position)
      swordRef2.current.quaternion.copy(quaternion)
    }

    if (s.isCharging && s.isHolding) {
      // Charging: gradually ramp up glow
      s.chargeProgress = Math.min(1, s.chargeProgress + (delta * 1000) / CHARGE_TIME_MS)
      glowUniformRef.current.value = s.chargeProgress
    } else if (s.isAnimating) {
      // Attacking: instant full glow
      glowUniformRef.current.value = 1
      s.chargeProgress = 0
    } else {
      // Idle: fade out smoothly
      s.chargeProgress = 0
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
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <group ref={swordRef2}>
        <mesh rotation={[0, Math.PI, 0]} ref={target} position={[0, -1.85, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.5, 1.7]} />
          <meshStandardMaterial color="red" visible={false} />
        </mesh>
      </group>
      <VFXEmitter
        name="slash"
        ref={slashEmitterRef}
        // autoStart={true}
        autoStart={false}
        localDirection={true}
        delay={1}
        direction={[[-1, -1], [0, 0], [0, 0]]}
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
