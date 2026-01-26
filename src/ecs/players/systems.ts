import type { World } from 'koota'
import { isOtherPlayer, PlayroomStateTrait, Position, QuaternionTrait, Animation } from './traits'

export const syncPlayerStateSystem = (world: World) => {
  world.query(isOtherPlayer).forEach((entity) => {
    const playroomState = entity.get(PlayroomStateTrait)?.state
    if (!playroomState) return

    // Access internal state directly as requested by user, fallback to getState
    // Cast to any because .state might not be in the public type definition
    const internalState = (playroomState as any).state || {}

    // Sync position
    const pos = internalState.position || playroomState.getState('position')
    if (pos) {
      entity.set(Position, { x: pos.x, y: pos.y, z: pos.z })
    }

    // Sync rotation (quaternion)
    // Handle both array [x,y,z,w] and object {x,y,z,w} formats
    const rot = internalState.quaternion || playroomState.getState('quaternion')

    const animation = internalState.animation || playroomState.getState('animation')
    
    if (animation) {
      if (typeof animation === 'string') {
         entity.set(Animation, { name: animation, speed: 1, clamp: false, loop: true })
      } else {
         entity.set(Animation, { 
           name: animation.name, 
           speed: animation.speed, 
           clamp: animation.clamp, 
           loop: animation.loop 
         })
      }
    }

    if (Array.isArray(rot) && rot.length >= 4) {
      entity.set(QuaternionTrait, { x: rot[0], y: rot[1], z: rot[2], w: rot[3] })
    } else if (rot && typeof rot === 'object') {
      entity.set(QuaternionTrait, { x: rot.x, y: rot.y, z: rot.z, w: rot.w })
    }
  })
}
