import { MeshStandardNodeMaterial } from 'three/webgpu'
import {
  normalView,
  positionViewDirection,
  dot,
  pow,
  float,
  mix,
  normalize,
  max,
  uniform,
  color,
  vec4,
} from 'three/tsl'

export const createEnemyCapsMaterial = (col: { r: number; g: number; b: number }) => {
  const mat = new MeshStandardNodeMaterial()
  mat.transparent = true
  mat.roughness = 0.3

  // Create a unique hit uniform per material instance
  const hitUniform = uniform(0)
  const opacityUniform = uniform(1)

  const fresnelPower = float(10)
  const fresnelDot = max(dot(normalize(positionViewDirection), normalize(normalView)), float(0))
  const fresnel = pow(float(1).sub(fresnelDot), fresnelPower)
  const col1 = color(col.r, col.g, col.b)
  const hitCol = color('#FF7139').mul(3).add(fresnel).mul(10)

  mat.colorNode = vec4(mix(col1, hitCol.mul(1), hitUniform), opacityUniform)

  // Return both the material and its hit uniform
  return { material: mat, hitUniform, opacityUniform }
}
