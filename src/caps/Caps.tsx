import * as THREE from 'three'
import { useRef, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react'
import { useGraph, useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import type { ThreeElements } from '@react-three/fiber'
import { useGameStore } from '../store'
import { VFXEmitter } from '../components/VFXParticles'
import type { GLTFResult, CapsHandle } from './types'
import { createCapsMaterial, createSwordMaterial } from './materials'
import { useCapsController } from './useCapsController'
import { Energy } from '@/components/particles/energy'

// Debug flag for hitbox visualization
const DEBUG_HITBOX = false

export type CapsProps = ThreeElements['group']
export const Caps = forwardRef<CapsHandle, CapsProps>(({ ...props }, ref) => {
  // Refs
  const group = useRef<THREE.Group>(null)
  const swordRef = useRef<THREE.SkinnedMesh>(null)
  const swordRef2 = useRef<THREE.Group>(null)
  const target = useRef<THREE.Mesh>(null)
  const slashEmitterRef = useRef<{ emit: (overrides?: Record<string, unknown>) => void } | null>(
    null
  )
  const sparkEmitterRef = useRef<{ emit: (overrides?: Record<string, unknown>) => void } | null>(
    null
  )

  // Store
  const setTarget = useGameStore((s) => s.setTarget)
  const updateSwordHitbox = useGameStore((s) => s.updateSwordHitbox)

  // Temp vectors for world transform extraction (avoid GC)
  const worldPos = useMemo(() => new THREE.Vector3(), [])
  const worldQuat = useMemo(() => new THREE.Quaternion(), [])

  // GLTF & Animations
  const { scene, animations } = useGLTF('/caps-42.glb')
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes } = useGraph(clone) as unknown as GLTFResult
  const { actions, mixer } = useAnimations(animations, group)

  // Controller hook - handles all animation logic
  // Only use controller if NOT remote
  const controller = useCapsController({
    actions,
    mixer,
    swordRef,
    swordRef2,
    group,
    slashEmitterRef,
    sparkEmitterRef,
  })

  const { onMouseDown, onMouseUp, onRightClick, isAttacking } = controller

  // Update sword hitbox world transform in store (for hit detection)
  useFrame(() => {
    if (target.current) {
      // Get world transform of sword plane
      target.current.updateWorldMatrix(true, false)
      target.current.getWorldPosition(worldPos)
      target.current.getWorldQuaternion(worldQuat)

      // Update store with sword hitbox world transform
      updateSwordHitbox(worldPos, worldQuat)
    }
  })

  useImperativeHandle(ref, () => ({ onMouseDown, onMouseUp, onRightClick }), [
    onMouseDown,
    onMouseUp,
    onRightClick,
  ])

  // Materials
  const capsMaterial = useMemo(() => createCapsMaterial(), [])
  const swordMaterial = useMemo(() => createSwordMaterial(), [])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Hitbox visualizer - shows attack range on ground */}

      <group ref={swordRef2}>
        <mesh ref={target} position={[0, -1.85, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.5, 1.7]} />
          <meshStandardMaterial color="red" visible={false} />
          <VFXEmitter
            name="sparks"
            ref={sparkEmitterRef}
            autoStart={false}
            position={[0, -0.2, 0]}
            localDirection={true}
            emitCount={1}
          />
          <Energy />
          {/* Debug hitbox circle - radius = 1.7 * 0.6 ≈ 1.02 (matches hit detection) */}
          {DEBUG_HITBOX && (
            <mesh rotation={[0, 0, 0]}>
              <circleGeometry args={[1.02, 32]} />
              <meshBasicMaterial
                color={isAttacking ? '#ff4444' : '#44ff44'}
                transparent
                opacity={isAttacking ? 0.4 : 0.1}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
        </mesh>
      </group>

      <VFXEmitter
        name="slash"
        ref={slashEmitterRef}
        position={[0, 0, 0.6]}
        autoStart={false}
        localDirection={true}
        delay={1}
        direction={[
          [1, 1],
          [0, 0],
          [0, 0],
        ]}
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
      </group>
    </>
  )
})

useGLTF.preload('/caps-42.glb')
