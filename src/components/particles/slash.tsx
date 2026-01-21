import * as THREE from 'three'
import { MeshBasicNodeMaterial } from 'three/webgpu'
import {
    uv, vec2,
    smoothstep, mix,
    texture, color, float,
    vec3,
    time,
    screenUV,
    viewportSharedTexture,
    normalize,
    max
} from 'three/tsl'
import { noiseTexture } from '../textures/noiseTexture'
import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import { voronoiTexture } from '../textures/voronoiTexture'
import { VFXParticles } from '../VFXParticles'

type GLTFResult = ReturnType<typeof useGLTF> & {
    nodes: { Cylinder: { geometry: THREE.BufferGeometry } }
}

export const Slash = () => {
    const { nodes } = useGLTF('/slash-1-transformed.glb') as GLTFResult

    const slashNodes = ({ progress }) => {

        const vor = texture(voronoiTexture, vec2(uv().x, uv().y).add(progress.mul(0.1)))
        const noise = texture(noiseTexture, vec2(uv().x, uv().y).mul(float(0.2).add(progress.mul(0.3).mod(1))))


        const color1 = color('#ffa808').mul(20)
        const glow = color('#8f9aff').mul(40)
        const glowMix = smoothstep(0.8, 1, uv().y).mul(noise.r.mul(2.).pow(8.))

        const finalColor = mix(color1, glow, glowMix)

        const xOpacity = uv().x
        const opacity = uv().y.sub(vor.r.pow(0.5)).sub(uv().y.oneMinus())
        const finalOpacity = opacity.mul(smoothstep(0.3, 1, xOpacity.sub(noise.r.mul(0.4))))
        const endFade = smoothstep(0.95, 1, uv().x)

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

        const backdropWithSlash = mix(distortedBackdrop, finalColor, finalOpacity.sub(endFade).clamp(0, 1))

        const backdrop = backdropWithSlash
        // const backdrop = uv().x

        const o = float(1).sub(smoothstep(0.6, 1, uv().y.oneMinus()))
        const finalO = o.mul(progress.oneMinus())

        return { backdrop, o: finalO }
    }


    return (
        <>
            {/* <group dispose={null} scale={1.5} rotation={[0, 0, 0]}>
           <mesh geometry={nodes.Cylinder.geometry} material={material} />
     </group> */}
            <VFXParticles
                autoStart={false}
                geometry={nodes.Cylinder.geometry}
                name="slash"
                maxParticles={50}
                position={[0, 0, 0]}
                delay={1}
                size={[1.6, 1.6]}
                fadeSize={[0.9, 1]}
                colorStart={["#ffffff"]}
                fadeOpacity={[1, 0]}
                gravity={[0, 0, 0]}
                speed={[0.1, 0.1]}
                lifetime={[0.2, 0.2]}
                friction={{
                    intensity: 0,
                    easing: "linear"
                }}
                direction={[[0, 0], [0, 0], [0, 0]]}
                startPosition={[[0, 0], [0, 0], [0, 0]]}
                rotation={[0, 0]}
                rotationSpeed={[[0, 0], [0, 0], [0, 0]]}
                orientToDirection={true}

                blending={1}
                lighting="basic"
                emitterShape={1}
                emitterRadius={[0, 1]}
                emitterAngle={0.7853981633974483}
                emitterHeight={[0, 1]}
                emitterDirection={[0, , 0]}
                backdropNode={({ progress }) => slashNodes({ progress }).backdrop}
                opacityNode={({ progress }) => slashNodes({ progress }).o}
            />
        </>

    )

}