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
}))
