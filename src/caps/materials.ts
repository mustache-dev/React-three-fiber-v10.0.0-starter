import { DoubleSide, MeshStandardNodeMaterial } from 'three/webgpu'
import { color, mix, uniform } from 'three/tsl'

// ============================================================================
// Exported Uniforms
// ============================================================================

// Sword glow uniform - 0 = no glow, 1 = full glow
export const swordGlowUniform = uniform(0)

// ============================================================================
// Materials
// ============================================================================

export const createCapsMaterial = () => {
  const mat = new MeshStandardNodeMaterial()
  mat.side = DoubleSide
  mat.roughness = 0.3
  mat.colorNode = color('#63acff')
  return mat
}

export const createSwordMaterial = () => {
  const mat = new MeshStandardNodeMaterial()
  const baseColor = color('#FCFBE6')
  const glowColor = color('#FF7139').mul(10)
  mat.colorNode = mix(baseColor, glowColor, swordGlowUniform)
  return mat
}
