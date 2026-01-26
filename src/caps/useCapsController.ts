import * as THREE from 'three'
import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store'
import { slashFlipX } from '../components/particles/slash'
import { swordGlowUniform } from './materials'
import { dealDamageInArea } from '../collision'
import type { ActionName, AnimationState } from './types'
import {
  Animations,
  ParryAnimations,
  ATTACK_SPEED,
  SPIN_ATTACK_SPEED,
  DASH_ATTACK_SPEED,
  CHARGE_DELAY_MS,
  CHARGE_TIME_MS,
  PARRY_DURATION_MS,
  PARRY_COOLDOWN_MS,
} from './types'
import { eventBus, EVENTS } from '../constants'
import { useVFXEmitter } from '@/components/VFXParticles/VFXEmitter'
import { me } from 'playroomkit'

const PARRY_SPEED = 2
const ATTACK_DAMAGE = 10
const SPIN_ATTACK_DAMAGE = 100

type UseCapsControllerProps = {
  actions: Record<string, THREE.AnimationAction | null>
  mixer: THREE.AnimationMixer | null
  swordRef: React.RefObject<THREE.SkinnedMesh | null>
  swordRef2: React.RefObject<THREE.Group | null>
  group: React.RefObject<THREE.Group | null>
  slashEmitterRef: React.RefObject<{ emit: (overrides?: Record<string, unknown>) => void } | null>
  sparkEmitterRef: React.RefObject<{ emit: (overrides?: Record<string, unknown>) => void } | null>
}

export const useCapsController = ({
  actions,
  mixer,
  swordRef,
  swordRef2,
  group,
  slashEmitterRef,
  sparkEmitterRef,
}: UseCapsControllerProps) => {
  const swordBoneRef = useRef<THREE.Bone | null>(null)
  const hitEntitiesRef = useRef<Set<string>>(new Set()) // Track entities hit during current attack

  const { start, stop } = useVFXEmitter('energy')
  // Store actions
  // Actions / setters (keep as selectors)
  const setIsCharging = useGameStore((s) => s.setIsCharging)
  const setSpinAttacking = useGameStore((s) => s.setSpinAttacking)
  const setParrying = useGameStore((s) => s.setParrying)
  const triggerSpinAttack = useGameStore((s) => s.triggerSpinAttack)
  const triggerDashAttack = useGameStore((s) => s.triggerDashAttack)
  const triggerAttackDash = useGameStore((s) => s.triggerAttackDash)

  // Animation state
  const state = useRef<AnimationState>({
    currentAnimation: Animations.STANCE,
    nextAttack: Animations.ATTACK_01,
    isAttacking: false,
    isParrying: false,
    isHolding: false,
    holdStartTime: 0,
    chargeProgress: 0,
    isInChargeStance: false,
    parryStartTime: 0,
    parryCooldownEnd: 0,
  })

  // Animation parameters for sync
  const animationParams = useRef({
    speed: 1,
    clamp: false,
    loop: true
  })

  // ---------------------------------------------------------------------------
  // Attack System
  // ---------------------------------------------------------------------------

  const executeAttack = (attackName: typeof Animations.ATTACK_01 | typeof Animations.ATTACK_02) => {
    const s = state.current
    const action = actions[attackName]
    if (!action) return

    // Fade out current, play attack
    actions[s.currentAnimation]?.fadeOut(0.1)
    action.reset().fadeIn(0.1).play()
    action.setLoop(THREE.LoopOnce, 1)
    action.setEffectiveTimeScale(ATTACK_SPEED)
    action.clampWhenFinished = true

    animationParams.current = { speed: ATTACK_SPEED, clamp: true, loop: false }

    s.isAttacking = true
    s.currentAnimation = attackName

    // Dash
    triggerAttackDash(1.2, 0.15)

    // Slash VFX - direction based on attack type
    slashFlipX.value = attackName === Animations.ATTACK_02 ? 0 : 1
    const direction =
      attackName === Animations.ATTACK_02
        ? [
            [1, 1],
            [0, 0],
            [0, 0],
          ]
        : [
            [-1, -1],
            [0, 0],
            [0, 0],
          ]
    slashEmitterRef.current?.emit({ direction })

    // Alternate next attack
    s.nextAttack = attackName === Animations.ATTACK_01 ? Animations.ATTACK_02 : Animations.ATTACK_01
  }

  const executeSpinAttack = () => {
    const s = state.current
    const action = actions[Animations.SPIN_ATTACK]
    if (!action) return

    actions[s.currentAnimation]?.fadeOut(0.1)
    action.reset().fadeIn(0.1).play()
    action.setLoop(THREE.LoopOnce, 1)
    action.setEffectiveTimeScale(SPIN_ATTACK_SPEED)
    action.clampWhenFinished = true
    
    animationParams.current = { speed: SPIN_ATTACK_SPEED, clamp: true, loop: false }

    s.isAttacking = true
    s.currentAnimation = Animations.SPIN_ATTACK
    setSpinAttacking(true)
    triggerSpinAttack()
  }

  const executeDashAttack = () => {
    const s = state.current
    const action = actions[Animations.DASH_ATTACK]
    if (!action) return

    actions[s.currentAnimation]?.fadeOut(0.1)
    action.reset().fadeIn(0.1).play()
    action.setLoop(THREE.LoopOnce, 1)
    action.setEffectiveTimeScale(DASH_ATTACK_SPEED)
    action.clampWhenFinished = true

    animationParams.current = { speed: DASH_ATTACK_SPEED, clamp: true, loop: false }

    s.isAttacking = true
    s.currentAnimation = Animations.DASH_ATTACK

    // Trigger dash movement (like spin attack)
    triggerDashAttack()

    // Slash VFX
    slashFlipX.value = 1
    slashEmitterRef.current?.emit({
      direction: [
        [-1, -1],
        [0, 0],
        [0, 0],
      ],
    })
  }

  const executeParry = () => {
    const s = state.current
    const now = Date.now()

    // Block if attacking, already parrying, or on cooldown
    if (s.isAttacking || s.isParrying || now < s.parryCooldownEnd) return

    // Pick random parry animation
    const randomIndex = Math.floor(Math.random() * ParryAnimations.length)
    const parryName = ParryAnimations[randomIndex]
    const action = actions[parryName]
    if (!action) return

    actions[s.currentAnimation]?.fadeOut(0.1)
    action.reset().fadeIn(0.1).play()
    action.setLoop(THREE.LoopOnce, 1)
    action.setEffectiveTimeScale(PARRY_SPEED)
    action.clampWhenFinished = true

    animationParams.current = { speed: PARRY_SPEED, clamp: true, loop: false }

    s.isParrying = true
    s.parryStartTime = now
    s.currentAnimation = parryName
    setParrying(true)
  }

  const exitParry = () => {
    const s = state.current
    s.isParrying = false
    s.parryCooldownEnd = Date.now() + PARRY_COOLDOWN_MS
    setParrying(false)

    // Return to stance
    actions[s.currentAnimation]?.fadeOut(0.1)
    actions[Animations.STANCE]?.reset().fadeIn(0.1).play()
    s.currentAnimation = Animations.STANCE
    animationParams.current = { speed: 1, clamp: false, loop: true }
  }

  const enterChargeStance = () => {
    const s = state.current
    if (s.isInChargeStance) return

    actions[s.currentAnimation]?.fadeOut(0.1)
    actions[Animations.STANCE]?.reset().fadeIn(0.1).play()
    s.currentAnimation = Animations.STANCE
    animationParams.current = { speed: 1, clamp: false, loop: true }
    s.isInChargeStance = true
    start()
    setIsCharging(true)
  }

  const exitChargeStance = () => {
    const s = state.current
    s.isInChargeStance = false
    s.chargeProgress = 0
    stop()
    setIsCharging(false)
  }

  // ---------------------------------------------------------------------------
  // Input Handlers
  // ---------------------------------------------------------------------------

  const onMouseDown = () => {
    const s = state.current
    s.isHolding = true
    s.holdStartTime = Date.now()
  }

  const onMouseUp = () => {
    const s = state.current

    if (!s.isHolding) return
    if (s.isAttacking || s.isParrying) {
      s.isHolding = false
      exitChargeStance()
      return
    }

    const wasInChargeStance = s.isInChargeStance
    const wasFullyCharged = s.chargeProgress >= 1

    s.isHolding = false
    exitChargeStance()

    // ⬇️ snapshot read
    const { isDashing } = useGameStore.getState()

    if (isDashing) {
      executeDashAttack()
    } else if (wasInChargeStance && wasFullyCharged) {
      executeSpinAttack()
    } else {
      executeAttack(s.nextAttack)
    }
  }

  const onRightClick = () => {
    executeParry()
  }

  // ---------------------------------------------------------------------------
  // Animation Finished Handler
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const onFinished = (e: { action: THREE.AnimationAction }) => {
      const finishedName = e.action.getClip().name as ActionName
      const attackAnimations: ActionName[] = [
        Animations.ATTACK_01,
        Animations.ATTACK_02,
        Animations.SPIN_ATTACK,
        Animations.DASH_ATTACK,
      ]

      if (attackAnimations.includes(finishedName)) {
        state.current.isAttacking = false
        hitEntitiesRef.current.clear() // Clear hit tracking for next attack
        eventBus.emit(EVENTS.ATTACK_END) // Notify attack ended (for camera shake reset)

        // Spin attack and dash attack return to stance after finishing
        if (finishedName === Animations.SPIN_ATTACK) {
          setSpinAttacking(false)
          actions[state.current.currentAnimation]?.fadeOut(0.1)
          actions[Animations.STANCE]?.reset().fadeIn(0.1).play()
          state.current.currentAnimation = Animations.STANCE
          animationParams.current = { speed: 1, clamp: false, loop: true }
        }

        if (finishedName === Animations.DASH_ATTACK) {
          actions[state.current.currentAnimation]?.fadeOut(0.1)
          actions[Animations.STANCE]?.reset().fadeIn(0.1).play()
          state.current.currentAnimation = Animations.STANCE
          animationParams.current = { speed: 1, clamp: false, loop: true }
        }
      }
      // Parry is handled by frame loop timer, not animation finish event
    }

    mixer?.addEventListener('finished', onFinished)
    return () => mixer?.removeEventListener('finished', onFinished)
  }, [mixer, setSpinAttacking, actions])

  // Initial stance animation
  useEffect(() => {
    const action = actions[Animations.STANCE]?.reset().fadeIn(0.1).play()
    if (action) {
      state.current.currentAnimation = Animations.STANCE
      animationParams.current = { speed: 1, clamp: false, loop: true }
    }
  }, [actions])

  // ---------------------------------------------------------------------------
  // Frame Loop
  // ---------------------------------------------------------------------------

  useFrame((_, delta) => {
    const s = state.current
    const currentGlow = swordGlowUniform.value

    // Find sword bone once
    if (!swordBoneRef.current && swordRef.current?.skeleton) {
      const bones = swordRef.current.skeleton.bones
      swordBoneRef.current = bones.find((b) => b.name === 'arm') || bones[bones.length - 1]
    }

    // Copy bone's world transform to swordRef2
    if (swordRef2.current && swordBoneRef.current && group.current) {
      group.current.updateMatrixWorld(true)
      const quaternion = swordBoneRef.current.quaternion.clone()
      swordRef2.current.quaternion.copy(quaternion)
    }

    // Parry duration check - return to stance after PARRY_DURATION_MS
    if (s.isParrying) {
      const parryElapsed = Date.now() - s.parryStartTime
      if (parryElapsed >= PARRY_DURATION_MS) {
        exitParry()
      }
    }

    // Charging logic
    if (s.isHolding && !s.isAttacking && !s.isParrying) {
      const holdDuration = Date.now() - s.holdStartTime

      if (holdDuration >= CHARGE_DELAY_MS && !s.isInChargeStance) {
        enterChargeStance()
      }

      if (s.isInChargeStance) {
        const chargeTime = holdDuration - CHARGE_DELAY_MS
        s.chargeProgress = Math.min(1, chargeTime / CHARGE_TIME_MS)
        swordGlowUniform.value = s.chargeProgress
      }
    } else if (s.isAttacking) {
      swordGlowUniform.value = 1
      const direction =
        s.nextAttack === Animations.ATTACK_02
          ? [
              [1, 1],
              [-1, -1],
              [0, 0],
            ]
          : [
              [-1, -1],
              [-1, -1],
              [0, 0],
            ]
      sparkEmitterRef.current?.emit({ direction: direction })

      const swordHitbox = useGameStore.getState().swordHitbox
      // Check sword hitbox for enemy hits using actual sword world position
      // The sword plane is centered at swordHitbox.position (world space)
      const hitboxX = swordHitbox.position.x
      const hitboxY = swordHitbox.position.y
      const hitboxZ = swordHitbox.position.z

      // Use sword height as radius (1.7 / 2 ≈ 0.85, but expand a bit for feel)
      const hitboxRadius = swordHitbox.height * 0.8

      // Determine damage based on attack type
      const damage =
        s.currentAnimation === Animations.SPIN_ATTACK ? SPIN_ATTACK_DAMAGE : ATTACK_DAMAGE

      // Deal damage only to enemies not yet hit in this attack
      const newHits = dealDamageInArea(
        hitboxX,
        hitboxZ,
        hitboxRadius,
        damage,
        'player',
        hitboxY, // Pass sword Y position for VFX
        hitEntitiesRef.current // Pass already-hit entities to exclude
      )

      // Track new hits
      for (const hitId of newHits) {
        hitEntitiesRef.current.add(hitId)
      }
    } else if (!s.isParrying) {
      swordGlowUniform.value = THREE.MathUtils.lerp(currentGlow, 0, delta * 12)
    }

    if (me()) {
      me().setState('animation', {
        name: s.currentAnimation,
        speed: animationParams.current.speed,
        clamp: animationParams.current.clamp,
        loop: animationParams.current.loop
      })
    }
  })

  return {
    onMouseDown,
    onMouseUp,
    onRightClick,
    isAttacking: state.current.isAttacking,
  }
}
