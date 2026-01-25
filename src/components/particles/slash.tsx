import * as THREE from 'three'
import {
  uv,
  vec2,
  smoothstep,
  mix,
  texture,
  color,
  float,
  vec3,
  screenUV,
  viewportSharedTexture,
  normalize,
  uniform,
} from 'three/tsl'
import { noiseTexture } from '../textures/noiseTexture'
import { useGLTF } from '@react-three/drei'
import { voronoiTexture } from '../textures/voronoiTexture'
import { VFXParticles } from '../VFXParticles'

type GLTFResult = ReturnType<typeof useGLTF> & {
  nodes: { Cylinder: { geometry: THREE.BufferGeometry } }
}

export const slashFlipX = uniform(0)

export const Slash = () => {
  const { nodes } = useGLTF('/slash-1-transformed.glb') as GLTFResult

  const slashNodes = ({ progress }) => {
    // Flip UV.x based on uniform: 0 = left slash (default), 1 = right slash
    const uvX = slashFlipX.greaterThan(0.5).select(uv().x, uv().x.oneMinus())

    const vor = texture(voronoiTexture, vec2(uvX, uv().y).add(progress.mul(1)))
    const noise = texture(
      noiseTexture,
      vec2(uvX, uv().y).mul(float(0.4).add(progress.mul(0.3).mod(1)))
    )

    // Dissolve noise - different sampling for variety
    const dissolveNoise = texture(
      noiseTexture,
      vec2(uvX.mul(0.02), uv().y.mul(0.3)).add(progress.mul(0.05)).add(uvX.oneMinus())
    )

    const color1 = color('#ffa808').mul(20)
    const glow = color('#8f9aff').mul(30)
    const dissolveEdgeColor = color('#ffffff').mul(50) // Bright edge during dissolve
    const glowMix = smoothstep(0.8, 1, uv().y).mul(noise.r.mul(2).pow(8))

    // Reveal animation (first part of life)
    const revealSpeed = float(3.0)
    const revealProgress = progress.mul(revealSpeed).clamp(0, 1)
    const revealCutoff = float(1).sub(revealProgress)
    const revealEdgeSoftness = float(0.15)
    const revealMask = smoothstep(
      revealCutoff.sub(revealEdgeSoftness),
      revealCutoff.add(revealEdgeSoftness),
      uvX.oneMinus()
    )

    // Dissolve animation (second part of life - starts at 0.3 progress)
    const dissolveStart = float(0.3)
    const dissolveProgress = progress
      .sub(dissolveStart)
      .div(float(1).sub(dissolveStart))
      .clamp(0, 1)
    const dissolveThreshold = dissolveProgress.mul(1.2) // Goes slightly over 1 to fully dissolve
    const dissolveValue = dissolveNoise.r.add(uvX.mul(0.3)) // Add gradient so it dissolves from edges
    const dissolveMask = smoothstep(
      dissolveThreshold.sub(0.05),
      dissolveThreshold.add(0.05),
      dissolveValue
    )

    // Dissolve edge glow - bright line at the dissolve boundary
    const dissolveEdge = smoothstep(0.0, 0.08, dissolveValue.sub(dissolveThreshold).abs())
    const dissolveEdgeIntensity = float(1).sub(dissolveEdge).mul(dissolveProgress)

    const xOpacity = uvX
    const opacity = uv().y.sub(vor.r.pow(4)).sub(uv().y.oneMinus().mul(0.5))
    const finalOpacity = opacity
      .mul(smoothstep(0.35, 1, xOpacity.sub(noise.r.mul(0.4))))
      .mul(revealMask)
      .mul(dissolveMask)
    const endFade = smoothstep(0.95, 1, uvX)

    const vUv = screenUV
    const distortionStrength = float(0.6)
    const distortAmount = vor.r.mul(noise.r).mul(finalOpacity.sub(endFade))

    const distortDir = normalize(vUv.sub(vec2(0.5, 0.5)))
    const distortion = distortDir.mul(distortAmount).mul(distortionStrength)

    const distortedUvR = vUv.add(distortion.mul(1.3))
    const distortedUvG = vUv.add(distortion)
    const distortedUvB = vUv.add(distortion.mul(0.7))

    const r = viewportSharedTexture(distortedUvR).r
    const g = viewportSharedTexture(distortedUvG).g
    const b = viewportSharedTexture(distortedUvB).b

    const distortedBackdrop = vec3(r, g, b)

    // Mix in dissolve edge glow
    const baseColor = mix(color1, glow, glowMix).mul(progress.oneMinus().mul(2))
    const colorWithDissolveEdge = mix(
      baseColor,
      dissolveEdgeColor,
      dissolveEdgeIntensity.mul(dissolveMask)
    )

    const backdropWithSlash = mix(
      distortedBackdrop,
      colorWithDissolveEdge,
      finalOpacity.sub(endFade).clamp(0, 1)
    )

    const backdrop = backdropWithSlash

    const o = float(1).sub(smoothstep(0.6, 1, uv().y.oneMinus()))
    const finalO = o.mul(progress.oneMinus()).mul(revealMask).mul(dissolveMask)

    return { backdrop, o: finalO }
  }

  const startPositionOffset = 0.2
  return (
    <>
      {/* <group dispose={null} scale={1.5} rotation={[0, 0, 0]}>
           <mesh geometry={nodes.Cylinder.geometry} material={material} />
     </group> */}
      <VFXParticles
        autoStart={false}
        geometry={nodes.Cylinder.geometry}
        name="slash"
        maxParticles={10}
        position={[0, 0, 0]}
        delay={1}
        size={1.8}
        fadeSize={[0.9, 1]}
        colorStart={['#ffffff']}
        fadeOpacity={[1, 0]}
        gravity={[0, 0, 0]}
        speed={[0.1, 0.1]}
        lifetime={[0.4, 0.4]}
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
        rotation={[0, 0]}
        rotationSpeed={[
          [0, 0],
          [0, 0],
          [0, 0],
        ]}
        orientToDirection={true}
        blending={1}
        lighting="basic"
        emitterShape={1}
        emitterRadius={[0, 1]}
        emitterAngle={0.7853981633974483}
        emitterHeight={[0, 1]}
        emitterDirection={[0, 1, 0]}
        backdropNode={({ progress }) => slashNodes({ progress }).backdrop}
        opacityNode={({ progress }) => slashNodes({ progress }).o}
      />
      {/* colorStart={["#FF4208", "#0E32FF"]} */}

      <VFXParticles
        // debug
        name="sparks"
        maxParticles={1000}
        position={[0, 0, 0]}
        autoStart={false}
        intensity={40}
        size={[0.05, 0.18]}
        fadeSize={[1, 0]}
        fadeSizeCurve={{
          points: [
            {
              pos: [0, 1],
              handleOut: [0, 0],
            },
            {
              pos: [1, 0],
              handleIn: [-0.58, 0],
            },
          ],
        }}
        colorStart={['#FF711E', '#3d91ff']}
        fadeOpacity={[1, 0]}
        gravity={[0, 0.3, 0]}
        speed={[0, 3]}
        lifetime={[0.5, 1]}
        friction={{
          intensity: 0,
          easing: 'linear',
        }}
        direction={[
          [-1, 1],
          [0, 1],
          [-1, 1],
        ]}
        startPosition={[
          [0, 0],
          [0, 0],
          [0, 0],
        ]}
        rotation={[0, 0]}
        rotationSpeed={[0, 0]}
        appearance="gradient"
        blending={1}
        lighting="basic"
        emitterShape={2}
        emitterRadius={[0, 0.3]}
        emitterAngle={0.4}
        emitterHeight={[0, 2.13]}
        emitterDirection={[0, 1, 0]}
        emitterSurfaceOnly={true}
      />
    </>
  )
}
