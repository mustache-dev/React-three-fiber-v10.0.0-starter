import { VFXParticles } from '../VFXParticles'
import { MeshBasicNodeMaterial, RingGeometry } from 'three/webgpu'
import {
    uv, vec2, vec4,
    atan, length, PI2,
    smoothstep, mix, clamp, abs,
    texture, color, float,
    vec3,
    time
} from 'three/tsl'
import { noiseTexture } from '../textures/noiseTexture'
import { useGLTF } from '@react-three/drei'
import { GLTF } from 'three-stdlib'
import { useMemo } from 'react'
import { voronoiTexture } from '../textures/voronoiTexture'
export const Slash = () => {

    const { nodes, materials } = useGLTF('/slash-1-transformed.glb') as GLTFResult

    const material = useMemo(() => {
        const mat = new MeshBasicNodeMaterial()
        mat.transparent = true
        const vor = texture(voronoiTexture, vec2(uv().x, uv().y).add(time.mul(0.1)))
        const noise = texture(noiseTexture, vec2(uv().x, uv().y).mul(time.mul(0.3).mod(1)))


        const color1 = color('#ffa808').mul(6)
        const color2 = color('#300202')
        const glow = color('#8f9aff').mul(10)
        const glowMix = smoothstep(0.8, 1, uv().y).mul(noise.r.mul(2).pow(10.))

        const finalColor = mix(color1, glow, glowMix)

        const opacity = uv().y.sub(vor.r.pow(0.5)).sub(uv().y.oneMinus())
        const finalOpacity = opacity.mul(smoothstep(0.3, 1, uv().x.sub(noise.r.mul(0.4))))
        const endFade = smoothstep(0.95, 1, uv().x)

        mat.backdropNode = vec4(finalColor, finalOpacity.sub(endFade))
        mat.opacityNode = finalOpacity.sub(endFade)
        return mat
    }, [])


    return (
        <group dispose={null} scale={1.5} rotation={[0, -Math.PI / 2, 0]}>
            <mesh geometry={nodes.Cylinder.geometry} material={material} />
        </group>
    )

}