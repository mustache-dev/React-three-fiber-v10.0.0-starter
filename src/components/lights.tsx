import { Environment } from "@react-three/drei";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../store";

export const Lights = () => {
  const shadowCameraSize = 100;
  const directionalLight = useRef(null)

  useFrame(() => {

    const playerPosition = useGameStore.getState().playerPosition;
    if (!playerPosition && !directionalLight.current) return;

    if (playerPosition) {
      directionalLight.current.position.x = playerPosition.x - 2;
      directionalLight.current.target.position.x = playerPosition.x;

      directionalLight.current.position.y = playerPosition.y + 5;
      directionalLight.current.target.position.y = playerPosition.y;

      directionalLight.current.position.z = playerPosition.z + 2;
      directionalLight.current.target.position.z = playerPosition.z;

      directionalLight.current.target.updateMatrixWorld();
    }
  })
  return (
    <>
      <directionalLight
        castShadow
        position={[20, 40, 20]}
        intensity={3}
        color={"#FFFFFF"}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={100}
        shadow-camera-left={-shadowCameraSize}
        shadow-camera-right={shadowCameraSize}
        shadow-camera-top={shadowCameraSize}
        shadow-camera-bottom={-shadowCameraSize}
        shadow-bias={-0.01}
        ref={directionalLight}
      />
      {/*<pointLight position={[0, 10, 0]} intensity={10} color={"#ffffff"} />*/}
      <ambientLight intensity={0.2} />
    </>
  );
}