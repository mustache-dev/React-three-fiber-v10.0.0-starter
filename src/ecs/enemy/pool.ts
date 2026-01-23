import * as THREE from 'three'
import { SkeletonUtils } from 'three-stdlib'
import { createEnemyCapsMaterial } from './material'

type PooledEnemy = {
  clone: THREE.Object3D
  material: ReturnType<typeof createEnemyCapsMaterial>
  inUse: boolean
}

const POOL_SIZE = 30 // Pre-create this many enemies
const pool: PooledEnemy[] = []
let scene: THREE.Object3D | null = null
let isInitialized = false
let initPromise: Promise<void> | null = null

/**
 * Initialize the pool with pre-cloned scenes and compiled materials
 * Call this once after the GLTF is loaded
 */
export const initializePool = async (gltfScene: THREE.Object3D) => {
  if (isInitialized || initPromise) return initPromise
  
  initPromise = new Promise((resolve) => {
    scene = gltfScene
    
    console.log(`🏊 Initializing enemy pool with ${POOL_SIZE} instances...`)
    const startTime = performance.now()
    
    // Pre-create clones and materials
    for (let i = 0; i < POOL_SIZE; i++) {
      const clone = SkeletonUtils.clone(scene)
      const material = createEnemyCapsMaterial({ r: 1, g: 0.2, b: 0.2 })
      
      pool.push({
        clone,
        material,
        inUse: false
      })
    }
    
    isInitialized = true
    console.log(`🏊 Pool initialized in ${(performance.now() - startTime).toFixed(1)}ms`)
    resolve()
  })
  
  return initPromise
}

/**
 * Get a pooled enemy instance
 * Returns null if pool is exhausted
 */
export const acquireFromPool = (): PooledEnemy | null => {
  const available = pool.find(p => !p.inUse)
  
  if (available) {
    available.inUse = true
    // Reset hit uniform
    available.material.hitUniform.value = 0
    return available
  }
  
  // Pool exhausted - create new (will cause stutter but better than crash)
  if (scene) {
    console.warn('⚠️ Enemy pool exhausted, creating new instance')
    const clone = SkeletonUtils.clone(scene)
    const material = createEnemyCapsMaterial({ r: 1, g: 0.2, b: 0.2 })
    const newEntry: PooledEnemy = { clone, material, inUse: true }
    pool.push(newEntry)
    return newEntry
  }
  
  return null
}

/**
 * Return an enemy instance to the pool
 */
export const releaseToPool = (entry: PooledEnemy) => {
  entry.inUse = false
  // Reset material
  entry.material.hitUniform.value = 0
}

/**
 * Check if pool is ready
 */
export const isPoolReady = () => isInitialized

/**
 * Get pool stats for debugging
 */
export const getPoolStats = () => ({
  total: pool.length,
  inUse: pool.filter(p => p.inUse).length,
  available: pool.filter(p => !p.inUse).length
})
