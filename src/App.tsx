import { Canvas } from '@react-three/fiber'
import { Lights } from './components/lights'
import { Html, KeyboardControls, OrbitControls, Preload, Stats } from '@react-three/drei'
import { PostProcessing } from './components/postprocessing'
import { MultiplayerSystem } from './ecs/players'
import { Floor } from './components/floor'
import { HalfFloatType } from 'three'
import { PlayerController } from './PlayerController'
import { Particles } from './components/particles'
import { PlayroomStarter } from './PlayroomStarter'
import { Suspense } from 'react'

function App() {
  // wobblysphere2 update the material so each changes trigger a re-render, better developer experience but doesn't follow the new R3F v10 API
  const keyboardMap = [
    { name: 'up', keys: ['KeyW', 'ArrowUp'] },
    { name: 'down', keys: ['KeyS', 'ArrowDown'] },
    { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
    { name: 'right', keys: ['KeyD', 'ArrowRight'] },
    { name: 'dash', keys: ['ShiftLeft'] },
  ]
  return (
    <>
      <Canvas
        flat
        shadows
        // shadows="soft"
        renderer={{
          antialias: false,
          depth: false,
          stencil: false,
          alpha: false,
          forceWebGL: false,
          outputType: HalfFloatType,
        }}
      >
        {/* <WobblySphere/>
      <WobblySphere2/> */}
        <Suspense fallback={<Html>loading...</Html>}>
          <Floor />
          <Lights />
          <PostProcessing />
          <Particles />
          {/*<OrbitControls /> */}
          <KeyboardControls map={keyboardMap}>
            <PlayerController />
          </KeyboardControls>

          {/* ECS Enemy System - spawns and manages enemy entities */}
          {/*<EnemySystem initialCount={10} spawnRadius={6} />*/}
          <MultiplayerSystem /> {/* Added MultiplayerSystem */}
          {/*<Stats />*/}
          <Preload all />
        </Suspense>
        <PlayroomStarter />
      </Canvas>
    </>
  )
}

export default App
