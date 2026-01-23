import { useRef, useEffect, useCallback } from 'react'
import { useActions } from 'koota/react'
import { enemyActions } from '@/ecs/enemy/actions'
import { eventBus, EVENTS } from '@/constants'
import { getWaveConfig } from './config'

export const useWaveManager = () => {
  const { spawnEnemyWave, destroyAllEnemies } = useActions(enemyActions)
  
  const currentWave = useRef(0)
  const enemiesRemaining = useRef(0)
  const isWaveActive = useRef(false)
  const waveTimeout = useRef<number | null>(null)

  const startWave = useCallback((waveNumber: number) => {
    const config = getWaveConfig(waveNumber)
    
    currentWave.current = waveNumber
    enemiesRemaining.current = config.enemyCount
    isWaveActive.current = true
    
    spawnEnemyWave(config.enemyCount, config.spawnRadius)
    eventBus.emit(EVENTS.WAVE_START, { wave: waveNumber + 1, enemyCount: config.enemyCount })
    
    console.log(`🌊 Wave ${waveNumber + 1} started: ${config.enemyCount} enemies`)
  }, [spawnEnemyWave])

  const onEnemyDead = useCallback(() => {
    if (!isWaveActive.current) return
    
    enemiesRemaining.current--
    
    if (enemiesRemaining.current <= 0) {
      isWaveActive.current = false
      const completedWave = currentWave.current
      
      eventBus.emit(EVENTS.WAVE_COMPLETE, { wave: completedWave + 1 })
      console.log(`✅ Wave ${completedWave + 1} complete!`)
      
      // Start next wave after delay
      const config = getWaveConfig(completedWave)
      waveTimeout.current = window.setTimeout(() => {
        startWave(completedWave + 1)
      }, config.delayBetweenWaves)
    }
  }, [startWave])

  // Subscribe to enemy death events
  useEffect(() => {
    eventBus.on(EVENTS.ENEMY_DEAD, onEnemyDead)
    return () => {
      eventBus.off(EVENTS.ENEMY_DEAD, onEnemyDead)
      if (waveTimeout.current) {
        clearTimeout(waveTimeout.current)
      }
    }
  }, [onEnemyDead])

  // Start first wave on mount
  useEffect(() => {
    startWave(0)
    return () => {
      destroyAllEnemies()
      if (waveTimeout.current) {
        clearTimeout(waveTimeout.current)
      }
    }
  }, [startWave, destroyAllEnemies])

  return {
    getCurrentWave: () => currentWave.current + 1,
    getEnemiesRemaining: () => enemiesRemaining.current,
    isWaveActive: () => isWaveActive.current,
  }
}
