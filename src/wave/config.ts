export type WaveConfig = {
  enemyCount: number
  spawnRadius: number
  delayBetweenWaves: number // ms
}

export const WAVES: WaveConfig[] = [
  { enemyCount: 3, spawnRadius: 2, delayBetweenWaves: 2000 },
  { enemyCount: 5, spawnRadius: 2, delayBetweenWaves: 2000 },
  { enemyCount: 7, spawnRadius: 2, delayBetweenWaves: 2500 },
  { enemyCount: 10, spawnRadius: 2, delayBetweenWaves: 3000 },
  { enemyCount: 12, spawnRadius: 2, delayBetweenWaves: 3000 },
]

// After all waves complete, loop with scaling
export const getWaveConfig = (waveNumber: number): WaveConfig => {
  if (waveNumber < WAVES.length) {
    return WAVES[waveNumber]
  }
  
  // Endless mode: scale difficulty
  const baseWave = WAVES[WAVES.length - 1]
  const extraWaves = waveNumber - WAVES.length + 1
  
  return {
    enemyCount: baseWave.enemyCount + extraWaves * 2,
    spawnRadius: Math.min(baseWave.spawnRadius + extraWaves * 0.5, 15),
    delayBetweenWaves: baseWave.delayBetweenWaves,
  }
}
