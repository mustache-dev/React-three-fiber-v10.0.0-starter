import * as THREE from 'three'
import { Quaternion, Vector3, Group, Euler } from "three/webgpu"
import { OrthographicCamera, useKeyboardControls } from "@react-three/drei"
import { useRef, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import gsap from "gsap"
import { useGameStore } from "./store"
import { Caps } from "./Caps"
import type { CapsHandle } from "./Caps"
import { VFXEmitter } from './components/VFXParticles'

export const PlayerController = () => {
    const playerRef = useRef<Group>(null)
    const velocity = useRef(new Vector3())
    const cameraRef = useRef<THREE.OrthographicCamera>(null)
    const capsRef = useRef<CapsHandle>(null)
    const scene = useThree((state) => state.scene)


    // Movement
    const speed = 6
    const speedMultiplier = useRef(1)
    const isDashing = useRef(false)
    const dashDelay = useRef(0)

    // Keyboard
    const [, get] = useKeyboardControls()
    const dodgeEmitterRef = useRef(null)
    const dodgeSparksEmitterRef = useRef(null)

    // Store state
    const setPlayerPosition = useGameStore((s) => s.setPlayerPosition)
    const isCharging = useGameStore((s) => s.isCharging)
    const isSpinAttacking = useGameStore((s) => s.isSpinAttacking)
    const spinAttackTriggered = useGameStore((s) => s.spinAttackTriggered)
    const clearSpinAttack = useGameStore((s) => s.clearSpinAttack)
    const attackDashTriggered = useGameStore((s) => s.attackDashTriggered)
    const clearAttackDash = useGameStore((s) => s.clearAttackDash)
    const isAttackDashing = useGameStore((s) => s.isAttackDashing)
    const setAttackDashing = useGameStore((s) => s.setAttackDashing)


    // Core dash function - reusable and parameterizable
    type DashConfig = {
        direction?: Vector3  // defaults to player's forward direction
        distance: number
        duration: number
        ease?: string        // defaults to "power2.out"
        cooldown?: number    // if set, applies cooldown after dash
        onStart?: () => void
        onComplete?: () => void
        skipIfDashing?: boolean // defaults to true
        isDodge?: boolean
    }

    const dash = (config: DashConfig) => {
        const {
            direction,
            distance,
            duration,
            ease = "power2.out",
            cooldown,
            onStart,
            onComplete,
            skipIfDashing = true,
            isDodge = false,
        } = config

        if (!playerRef.current) return
        if (skipIfDashing && isDashing.current) return
        if (cooldown !== undefined && dashDelay.current > 0) return
        isDodge && dodgeEmitterRef.current?.start()
        isDodge && dodgeSparksEmitterRef.current?.start()

        const dir = direction ?? playerRef.current.getWorldDirection(new THREE.Vector3())
        if (dir.length() === 0) return

        isDashing.current = true
        onStart?.()

        const target = playerRef.current.position.clone().add(
            dir.clone().normalize().multiplyScalar(distance)
        )

        gsap.to(playerRef.current.position, {
            x: target.x,
            y: target.y,
            z: target.z,
            duration,
            ease,
            onComplete: () => {
                isDashing.current = false
                if (cooldown !== undefined) dashDelay.current = cooldown
                dodgeEmitterRef.current?.stop()
                dodgeSparksEmitterRef.current?.stop()
                onComplete?.()
            }
        })
    }

    // Specific dash presets using the core function
    const spinAttackDash = (direction: Vector3, distance: number) => {
        dash({
            direction,
            distance,
            duration: 0.4,
            ease: "power3.in",
            skipIfDashing: false
        })
    }

    const attackDash = (distance: number, duration: number) => {
        dash({
            distance,
            duration,
            onStart: () => setAttackDashing(true),
            onComplete: () => setAttackDashing(false)
        })
    }

    const dashTo = (direction: Vector3, distance: number) => {
        dash({
            direction,
            distance,
            duration: 0.2,
            cooldown: 0.4,
            isDodge: true
        })
    }

    const updateCamera = (delta: number) => {
        if (!playerRef.current || !cameraRef.current) return
        const { x, y, z } = playerRef.current.position
        const targetPosition = new Vector3(x, y + 6, z + 5)
        cameraRef.current.position.lerp(targetPosition, 4 * delta)
    }

    const updateVelocity = () => {
        const { up, down, left, right } = get()
        velocity.current.x = Number(right) - Number(left)
        velocity.current.z = Number(down) - Number(up)
        velocity.current.y = 0
        velocity.current.normalize()
    }

    const updatePlayerPosition = (delta: number) => {
        if (!playerRef.current || isDashing.current) return
        const effectiveSpeed = speed * speedMultiplier.current
        playerRef.current.position.add(velocity.current.clone().multiplyScalar(delta * effectiveSpeed))
    }

    const updatePlayerRotation = (delta: number, pointer: { x: number, y: number }) => {
        if (!playerRef.current) return
        const targetRotation = new Quaternion().setFromEuler(new Euler(0, Math.atan2(pointer.x, -pointer.y), 0))
        playerRef.current.quaternion.slerp(targetRotation, delta * 10)
    }

    // Input handlers
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
                const dashDir = velocity.current.length() > 0
                    ? velocity.current.clone()
                    : playerRef.current?.getWorldDirection(new Vector3()) ?? new Vector3(0, 0, -1)
                dashTo(dashDir, 3)
            }
        }

        const handleMouseDown = () => capsRef.current?.onMouseDown()
        const handleMouseUp = () => capsRef.current?.onMouseUp()

        window.addEventListener("keydown", handleKeyDown)
        window.addEventListener("mousedown", handleMouseDown)
        window.addEventListener("mouseup", handleMouseUp)

        return () => {
            window.removeEventListener("keydown", handleKeyDown)
            window.removeEventListener("mousedown", handleMouseDown)
            window.removeEventListener("mouseup", handleMouseUp)
        }
    }, [])

    // Game loop
    useFrame(({ delta, pointer }) => {
        if (!playerRef.current || !cameraRef.current) return

        // Speed multiplier: slow down when charging, spin attacking, or attack dashing
        const shouldSlowDown = isCharging || isSpinAttacking || isAttackDashing
        if (shouldSlowDown) {
            // Smooth, gradual slowdown (instant for attack dash)
            const lerpSpeed = isAttackDashing ? 20 : 3
            speedMultiplier.current = THREE.MathUtils.lerp(speedMultiplier.current, 0, delta * lerpSpeed)
        } else {
            speedMultiplier.current = THREE.MathUtils.lerp(speedMultiplier.current, 1, delta * 6)
        }

        // Trigger spin attack dash
        if (spinAttackTriggered) {
            clearSpinAttack()
            const dashDir = playerRef.current.getWorldDirection(new THREE.Vector3())
            spinAttackDash(dashDir, 2)
        }

        // Trigger attack dash
        if (attackDashTriggered) {
            const { distance, duration } = attackDashTriggered
            clearAttackDash()
            attackDash(distance, duration)
        }

        updateCamera(delta)
        updateVelocity()
        updatePlayerPosition(delta)
        updatePlayerRotation(delta, pointer)
        setPlayerPosition(playerRef.current.position)
        dashDelay.current -= delta
    })

    return (
        <>
            <OrthographicCamera
                ref={cameraRef}
                makeDefault
                position={[10, 20, 0]}
                rotation={[-Math.PI / 4, 0, 0]}
                zoom={80}
                near={0.1}
                far={60}
            />

            <group ref={playerRef}>
                <Caps ref={capsRef} />
                <VFXEmitter position={[0, 0.1, 0]} ref={dodgeEmitterRef} name="dodge" emitCount={1} autoStart={false} delay={0.0} />
                <VFXEmitter position={[0, 0.1, 0]} localDirection={true} direction={[[0, 0], [0, 1], [-1, -1]]} ref={dodgeSparksEmitterRef} name="dodge-sparks" emitCount={1} autoStart={false} />
            </group>
        </>
    )
}
