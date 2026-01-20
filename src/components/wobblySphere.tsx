import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useLocalNodes } from "@react-three/fiber/webgpu";
import { useMemo } from "react";
import {
  normalGeometry,
  positionLocal,
  sin,
  texture,
  time,
  mul,
} from "three/tsl";
import {
  MeshStandardNodeMaterial,
  RepeatWrapping,
  TextureLoader,
  LinearFilter,
} from "three/webgpu";

export const WobblySphere = () => {
  const noise = useLoader(TextureLoader, "./noise.png");
  noise.wrapS = noise.wrapT = RepeatWrapping;
  noise.minFilter = noise.magFilter = LinearFilter;

  const { n } = useLocalNodes(() => ({
    n: mul(
      texture(noise, normalGeometry.add(time.mul(100)))
        .r.sub(0.5)
        .mul(3),
      0.1,
    ),
  }));
  return (
    <mesh
      onFramed={(inView: boolean) => {
        console.log(inView ? "Object entered view" : "Object left view");
      }}
      position={[1.5, 0, 0]}
    >
      <sphereGeometry args={[1, 128, 128]} />
      <meshStandardNodeMaterial
        positionNode={positionLocal.add(n.mul(normalGeometry).mul(2))}
        color={"#FF0000"}
        roughness={0.8}
      />
    </mesh>
  );
};
