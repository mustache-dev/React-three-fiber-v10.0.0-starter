import { Environment } from "@react-three/drei";

export const Lights = () => {
  return (
    <>
      <directionalLight
      castShadow
      
      position={[1000, 100, 100]}
      intensity={10}
      color={"#ffffffff"}
      shadow-mapSize={[4096, 4096]}
    />

    <Environment preset="sunset" background backgroundBlurriness={1} />
    </>
  );
}