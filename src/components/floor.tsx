import { useMemo } from 'react'
import { color, float, floor, mod, uv, mix, vec3, texture } from 'three/tsl'
import {
  MeshStandardNodeMaterial,
  TextureLoader,
  RepeatWrapping,
  NearestFilter,
  LinearFilter,
} from 'three/webgpu'
import { useLoader } from '@react-three/fiber'

export const Floor = () => {
  const noise = useLoader(TextureLoader, './noise.png')
  noise.wrapS = noise.wrapT = RepeatWrapping
  noise.minFilter = noise.magFilter = LinearFilter
  const material = useMemo(() => {
    const mat = new MeshStandardNodeMaterial()
    mat.roughness = 0
    const n = texture(noise, uv())

    const colorA = color('#3b3b3b')
    const colorB = color('#272727')

    const scale = float(60)
    const scaledUv = uv().mul(scale)

    const cell = floor(scaledUv)

    const checker = mod(cell.x.add(cell.y), 2)

    const finalColor = mix(colorA, colorB, 0.2)

    mat.colorNode = mix(finalColor, checker, float(0.003).mul(n)).sub(n.mul(0.03))

    return mat
  }, [])
  return (
    <mesh material={material} receiveShadow position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[100, 100]} />
    </mesh>
  )
}
