
import { Canvas } from '@react-three/fiber'
import { Lights } from './components/lights'
import { KeyboardControls, OrbitControls } from '@react-three/drei'
import { PostProcessing } from './components/postprocessing'
import { EnemySystem } from './ecs/enemy'
import { Floor } from './components/floor'
import { HalfFloatType } from 'three'
import { PlayerController } from './PlayerController'
import { Particles } from './components/particles'

function App() {

  // wobblysphere2 update the material so each changes trigger a re-render, better developer experience but doesn't follow the new R3F v10 API
  const keyboardMap = [
    { name: "up", keys: ["KeyW", "ArrowUp"] },
    { name: "down", keys: ["KeyS", "ArrowDown"] },
    { name: "left", keys: ["KeyA", "ArrowLeft"] },
    { name: "right", keys: ["KeyD", "ArrowRight"] },
    { name: "dash", keys: ["ShiftLeft"] },
  ];
  return (
    <>
      <Canvas flat shadows='soft' renderer={{ antialias: false, depth: false, stencil: false, alpha: false, forceWebGL: false, outputType: HalfFloatType }}>
        {/* <WobblySphere/>
      <WobblySphere2/> */}
        <Floor />
        <Lights />
        <PostProcessing />
        <Particles />
        {/* <OrbitControls /> */}
        <KeyboardControls map={keyboardMap}>
          <PlayerController />
        </KeyboardControls>

        {/* ECS Enemy System - spawns and manages enemy entities */}
        <EnemySystem initialCount={10} spawnRadius={6} />
      </Canvas>

    </>
  )
}

export default App
