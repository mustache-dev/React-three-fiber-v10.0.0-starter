import { Canvas } from "@react-three/fiber";
import { WobblySphere } from "./components/wobblySphere";
import { Lights } from "./components/lights";
import { OrbitControls } from "@react-three/drei";
import { PostProcessing } from "./components/postprocessing";
import { WobblySphere2 } from "./components/wobblySphere2";
import { Model } from "./components/Checkered_tile_floor";

function App() {
  // wobblysphere2 update the material so each changes trigger a re-render, better developer experience but doesn't follow the new R3F v10 API
  return (
    <>
      <Canvas renderer={{ forceWebGL: false }} hmr={true}>
        <WobblySphere />
        <WobblySphere2 />
        <Lights />
        <Model />
        <OrbitControls />
        <PostProcessing />
      </Canvas>
    </>
  );
}

export default App;
