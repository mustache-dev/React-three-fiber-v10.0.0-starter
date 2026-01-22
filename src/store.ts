import { Vector3 } from "three";
import { create } from "zustand";

interface GameState {
    playerPosition: Vector3
    setPlayerPosition: (position: Vector3) => void
    
    // Combat state
    isCharging: boolean
    setIsCharging: (charging: boolean) => void
    isSpinAttacking: boolean
    setSpinAttacking: (attacking: boolean) => void
    spinAttackTriggered: boolean
    triggerSpinAttack: () => void
    clearSpinAttack: () => void
    target: Mesh | null
    setTarget: (target: Mesh | null) => void
    
    // Attack dash (composable)
    attackDashTriggered: { distance: number; duration: number } | null
    triggerAttackDash: (distance?: number, duration?: number) => void
    clearAttackDash: () => void
    isAttackDashing: boolean
    setAttackDashing: (dashing: boolean) => void
}

export const useGameStore = create<GameState>((set) => ({
    playerPosition: new Vector3(),
    setPlayerPosition: (position) => set({ playerPosition: position }),
    
    // Combat state
    isCharging: false,
    setIsCharging: (charging) => set({ isCharging: charging }),
    isSpinAttacking: false,
    setSpinAttacking: (attacking) => set({ isSpinAttacking: attacking }),
    spinAttackTriggered: false,
    triggerSpinAttack: () => set({ spinAttackTriggered: true }),
    clearSpinAttack: () => set({ spinAttackTriggered: false }),
    target: null,
    setTarget: (target) => set({ target }),
    
    // Attack dash (composable)
    attackDashTriggered: null,
    triggerAttackDash: (distance = 1.2, duration = 0.15) => set({ attackDashTriggered: { distance, duration } }),
    clearAttackDash: () => set({ attackDashTriggered: null }),
    isAttackDashing: false,
    setAttackDashing: (dashing) => set({ isAttackDashing: dashing }),
}))
