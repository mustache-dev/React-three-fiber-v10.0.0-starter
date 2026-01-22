import type { CollisionEntity } from './types'

// ============================================================================
// Spatial Hash Grid for Broad Phase Collision Detection
// Reduces collision checks from O(n²) to approximately O(n)
// ============================================================================

export class SpatialGrid {
  private cellSize: number
  private cells: Map<number, Set<string>> = new Map()
  private entities: Map<string, CollisionEntity> = new Map()

  constructor(cellSize = 2) {
    this.cellSize = cellSize
  }

  // Fast spatial hash
  private hash(cx: number, cz: number): number {
    return cx * 73856093 ^ cz * 19349663
  }

  clear() {
    this.cells.clear()
    this.entities.clear()
  }

  insert(entity: CollisionEntity) {
    const { x, z } = entity.position
    const radius = entity.collider.radius

    this.entities.set(entity.id, entity)

    // Insert into all cells the circle overlaps
    const minX = Math.floor((x - radius) / this.cellSize)
    const maxX = Math.floor((x + radius) / this.cellSize)
    const minZ = Math.floor((z - radius) / this.cellSize)
    const maxZ = Math.floor((z + radius) / this.cellSize)

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cz = minZ; cz <= maxZ; cz++) {
        const hash = this.hash(cx, cz)
        if (!this.cells.has(hash)) this.cells.set(hash, new Set())
        this.cells.get(hash)!.add(entity.id)
      }
    }
  }

  // Get entity by ID
  getEntity(id: string): CollisionEntity | undefined {
    return this.entities.get(id)
  }

  // Get all entities in cells that overlap with given position + radius
  query(x: number, z: number, radius: number): CollisionEntity[] {
    const result: CollisionEntity[] = []
    const seen = new Set<string>()

    const minX = Math.floor((x - radius) / this.cellSize)
    const maxX = Math.floor((x + radius) / this.cellSize)
    const minZ = Math.floor((z - radius) / this.cellSize)
    const maxZ = Math.floor((z + radius) / this.cellSize)

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cz = minZ; cz <= maxZ; cz++) {
        const hash = this.hash(cx, cz)
        const cell = this.cells.get(hash)
        if (cell) {
          for (const id of cell) {
            if (!seen.has(id)) {
              seen.add(id)
              const entity = this.entities.get(id)
              if (entity) result.push(entity)
            }
          }
        }
      }
    }
    return result
  }

  // Query excluding a specific entity ID
  queryExcluding(x: number, z: number, radius: number, excludeId: string): CollisionEntity[] {
    return this.query(x, z, radius).filter(e => e.id !== excludeId)
  }

  // Get all entities
  getAllEntities(): CollisionEntity[] {
    return Array.from(this.entities.values())
  }
}

// ============================================================================
// Global grid instance (singleton for simplicity)
// ============================================================================

export const collisionGrid = new SpatialGrid(2)
