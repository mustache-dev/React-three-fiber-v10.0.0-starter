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

const ATTACK_SPEED = 2.5
const SPIN_ATTACK_SPEED = 1.5
const CHARGE_TIME_MS = 500

// ============================================================================
// Component
// ============================================================================

export const Caps = forwardRef<CapsHandle, ThreeElements['group']>((props, ref) => {
  const group = useRef<THREE.Group>(null)

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
      action.setLoop(THREE.LoopOnce, 1)
      action.setEffectiveTimeScale(ATTACK_SPEED)
      action.clampWhenFinished = true
      s.isAnimating = true
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

  // ---------------------------------------------------------------------------
  // Input Handlers
  // ---------------------------------------------------------------------------

  const onMouseDown = () => {
    const s = state.current
    s.isHolding = true
    s.holdStartTime = Date.now()

    // Only charge if not already attacking
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
      // Spin attack (only if we were actually charging)
      triggerSpinAttack()
      playAnimation('spin-attack', 0.1)
    } else if (!s.isAnimating) {
      // Quick attack - not animating, play immediately
      playAnimation(s.nextAttack, 0.1)
      s.nextAttack = s.nextAttack === 'attack01' ? 'attack02' : 'attack01'
    } else {
      // Currently animating - queue the next attack
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

        // Clear spin attacking state
        if (finishedName === 'spin-attack') {
          setSpinAttacking(false)
        }

        // Process queued attack
        if (s.queuedAttack) {
          s.queuedAttack = false
          // Small delay to let animation system settle
          setTimeout(() => {
            if (!state.current.isAnimating) {
              const nextAnim = state.current.nextAttack
              state.current.nextAttack = nextAnim === 'attack01' ? 'attack02' : 'attack01'

              // Manually trigger animation
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

  // ---------------------------------------------------------------------------
  // Expose Methods
  // ---------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({ onMouseDown, onMouseUp }), [])

  // ---------------------------------------------------------------------------
  // Initial Animation
  // ---------------------------------------------------------------------------

  useEffect(() => {
    playAnimation('stance')
  }, [actions])

  // ---------------------------------------------------------------------------
  // Glow Animation Loop
  // ---------------------------------------------------------------------------

  useFrame((_, delta) => {
    if (!glowUniformRef.current) return

    const s = state.current
    const currentGlow = glowUniformRef.current.value

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
      glowUniformRef.current.value = THREE.MathUtils.lerp(currentGlow, 0, delta * 4)
    }
  })

  // ---------------------------------------------------------------------------
  // Materials
  // ---------------------------------------------------------------------------

  const capsMaterial = useMemo(() => {
    const mat = new MeshStandardNodeMaterial()
    mat.roughness = 0.3
    mat.colorNode = color('#416EFF')
    return mat
  }, [])

  const { swordMaterial, glowU } = useMemo(() => {
    const u = uniform(0)
    const mat = new MeshStandardNodeMaterial()
    const baseColor = color('#FCFBE6')
    const glowColor = color('#FFC579').mul(10)
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
    </group>
  )
})

useGLTF.preload('/caps.glb')
