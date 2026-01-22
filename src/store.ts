import { Vector3, Quaternion, type Mesh } from "three";
import { create } from "zustand";

// Sword hitbox transform (updated every frame from Caps.tsx)
export type SwordHitbox = {
    position: Vector3
    quaternion: Quaternion
    width: number   // plane width (0.5)
    height: number  // plane height (1.7)
}

interface GameState {
    playerPosition: Vector3
    setPlayerPosition: (position: Vector3) => void
    
    // Combat state
    isCharging: boolean
    setIsCharging: (charging: boolean) => void
    isSpinAttacking: boolean
    setSpinAttacking: (attacking: boolean) => void
    isParrying: boolean
    setParrying: (parrying: boolean) => void
    isDashing: boolean
    setDashing: (dashing: boolean) => void
    spinAttackTriggered: boolean
    triggerSpinAttack: () => void
    clearSpinAttack: () => void
    dashAttackTriggered: boolean
    triggerDashAttack: () => void
    clearDashAttack: () => void
    target: Mesh | null
    setTarget: (target: Mesh | null) => void
    
    // Sword hitbox (world space)
    swordHitbox: SwordHitbox
    updateSwordHitbox: (position: Vector3, quaternion: Quaternion) => void
    
    // Attack dash (composable)
    attackDashTriggered: { distance: number; duration: number } | null
    triggerAttackDash: (distance?: number, duration?: number) => void
    clearAttackDash: () => void
    isAttackDashing: boolean
    setAttackDashing: (dashing: boolean) => void
}

export const useGameStore = create<GameState>((set, get) => ({
    playerPosition: new Vector3(),
    setPlayerPosition: (position) => set({ playerPosition: position }),
    
    // Combat state
    isCharging: false,
    setIsCharging: (charging) => set({ isCharging: charging }),
    isSpinAttacking: false,
    setSpinAttacking: (attacking) => set({ isSpinAttacking: attacking }),
    isParrying: false,
    setParrying: (parrying) => set({ isParrying: parrying }),
    isDashing: false,
    setDashing: (dashing) => set({ isDashing: dashing }),
    spinAttackTriggered: false,
    triggerSpinAttack: () => set({ spinAttackTriggered: true }),
    clearSpinAttack: () => set({ spinAttackTriggered: false }),
    dashAttackTriggered: false,
    triggerDashAttack: () => set({ dashAttackTriggered: true }),
    clearDashAttack: () => set({ dashAttackTriggered: false }),
    target: null,
    setTarget: (target) => set({ target }),
    
    // Sword hitbox (world space) - mutate in place for performance
    swordHitbox: {
        position: new Vector3(),
        quaternion: new Quaternion(),
        width: 0.5,
        height: 1.7
    },
    updateSwordHitbox: (position, quaternion) => {
        const hitbox = get().swordHitbox
        hitbox.position.copy(position)
        hitbox.quaternion.copy(quaternion)
    },
    
    // Attack dash (composable)
    attackDashTriggered: null,
    triggerAttackDash: (distance = 1.2, duration = 0.15) => set({ attackDashTriggered: { distance, duration } }),
    clearAttackDash: () => set({ attackDashTriggered: null }),
    isAttackDashing: false,
    setAttackDashing: (dashing) => set({ isAttackDashing: dashing }),
}))
