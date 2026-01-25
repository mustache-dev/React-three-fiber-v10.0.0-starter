import { uv, vec2, vec4, step, float, color } from 'three/tsl'
import { VFXParticles } from '../VFXParticles'
import { useVFXEmitter } from '../VFXParticles/VFXEmitter'
import { PlaneGeometry } from 'three/webgpu'
import { useEffect, useMemo } from 'react'
import { EVENTS, eventBus } from '@/constants'

export const EnemyDeath = () => {
  const col = color('#fc6717')
  const { emit } = useVFXEmitter('death')
  const { emit: emitCircle } = useVFXEmitter('death-2')

  const colorNode = (progress: typeof float) => {
    const center = vec2(0.5)
    const dist = uv().mul(2).sub(1).length()
    const thickness = float(0.02)
    const circle = step(dist, float(0.9))
    const innerCircle = float(float(1).add(progress)).sub(dist).max(0)
    return vec4(col.mul(20), circle.sub(innerCircle))
  }

  useEffect(() => {
    eventBus.on(EVENTS.ENEMY_DEAD, (position) => {
      const { x, y, z } = position
      emit([x, y, z], 50)
      emitCircle([x, y, z], 1)
    })
  }, [emit, emitCircle])

  return (
    <>
      <VFXParticles
        name="death"
        autoStart={false}
        maxParticles={1000}
        position={[0, 0, 0]}
        emitCount={100}
        delay={0.99}
        intensity={5}
        size={[0.04, 0.1]}
        fadeSize={[1, 0]}
        colorStart={['#ff2600']}
        fadeOpacity={[1, 0]}
        gravity={[0, -15, 0]}
        speed={[0, 4.47]}
        lifetime={[1, 3]}
        velocityCurve={{
          points: [
            {
              pos: [0, 1],
              handleOut: [0.33, 0],
            },
            {
              pos: [1, 0.1545880126953125],
              handleIn: [-0.33, 0],
            },
          ],
        }}
        direction={[
          [-1, 1],
          [-1, 1],
          [-1, 1],
        ]}
        startPosition={[
          [0, 0],
          [0, 0],
          [0, 0],
        ]}
        rotation={[0, 0]}
        rotationSpeed={[0, 0]}
        appearance="circular"
        blending={2}
        lighting="basic"
        emitterShape={1}
        emitterRadius={[0, 1]}
        emitterAngle={0.7853981633974483}
        emitterHeight={[0, 1]}
        emitterDirection={[0, 1, 0]}
        collision={{
          plane: {
            y: -1,
          },
          bounce: 0.47,
          friction: 0.41,
          die: false,
          sizeBasedGravity: 0,
        }}
      />
      <VFXParticles
        name="death-2"
        autoStart={false}
        geometry={new PlaneGeometry(1, 1, 1, 1)}
        maxParticles={10}
        position={[0, 0, 0]}
        delay={1}
        size={5}
        fadeSize={[1, 0]}
        fadeSizeCurve={{
          points: [
            {
              pos: [0, 0],
              handleOut: [0.21773937321320794, 0.4127827096096921],
            },
            {
              pos: [1, 1],
              handleIn: [-0.5943960000000001, 7.279251588259904e-17],
            },
          ],
        }}
        colorStart={['#ffffff']}
        fadeOpacity={[1, 0]}
        gravity={[0, 0, 0]}
        speed={[0, 0]}
        lifetime={0.3}
        friction={{
          intensity: 0,
          easing: 'linear',
        }}
        direction={[
          [0, 0],
          [0, 0],
          [0, 0],
        ]}
        startPosition={[
          [0, 0],
          [0, 0],
          [0, 0],
        ]}
        emitCount={1}
        rotation={[
          [-Math.PI / 2, -Math.PI / 2],
          [0, 0],
          [0, 0],
        ]}
        rotationSpeed={[0, 0]}
        appearance="gradient"
        blending={2}
        lighting="basic"
        emitterShape={1}
        emitterRadius={[0, 1]}
        emitterAngle={0.7853981633974483}
        emitterHeight={[0, 1]}
        emitterDirection={[0, 1, 0]}
        colorNode={({ progress }) => colorNode(progress)}
      />
    </>
  )
}
