import { createActions } from 'koota'
import {
  isOtherPlayer,
  PlayerId,
  Animation,
  PlayroomStateTrait,
  Position,
  QuaternionTrait,
  Color,
  MeshRef,
} from './traits'
import type { PlayerState } from 'playroomkit'

export const playerActions = createActions((world) => ({
  spawnOtherPlayer: (state: PlayerState) => {
    const id = state.id

    // Check if player already exists
    const existing = world.query(isOtherPlayer).find((e) => e.get(PlayerId)?.id === id)
    if (existing) return existing

    const entity = world.spawn(
      isOtherPlayer,
      PlayerId({ id }),
      Animation({ name: null, speed: 1, clamp: false, loop: false }),
      PlayroomStateTrait({ state }),
      Position({ x: 0, y: 0, z: 0 }),
      QuaternionTrait({ x: 0, y: 0, z: 0, w: 1 }),
      Color({ r: 0, g: 1, b: 0 }),
      MeshRef({ current: null })
    )

    console.log(`Spawned other player: ${id}`)
    return entity
  },

  despawnOtherPlayer: (state: PlayerState) => {
    const id = state.id
    let targetEntity: ReturnType<typeof world.spawn> | undefined

    world.query(isOtherPlayer).forEach((e) => {
      if (e.get(PlayerId)?.id === id) {
        targetEntity = e
      }
    })

    if (targetEntity) {
      targetEntity.destroy()
      console.log(`Despawned other player: ${id}`)
    }
  },
}))
