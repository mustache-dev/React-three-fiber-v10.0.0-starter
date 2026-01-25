import { create } from "zustand";

export const usePlayroomStore = create((set) => ({
  players: [],

  addPlayer: (player) =>
    set((state) => ({
      players: [...state.players, player],
    })),

  removePlayer: (player) =>
    set((state) => ({
      players: state.players.filter((p) => p.id !== player.id),
    })),
}));