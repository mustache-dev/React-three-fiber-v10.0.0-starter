import { useLoader } from "@react-three/fiber";
import { useFrame } from "@react-three/fiber/webgpu";
import { useMemo, useRef } from "react";
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
  Mesh,
} from "three/webgpu";

export const WobblySphere2 = () => {
  const noise = useLoader(TextureLoader, "./noise.png");
  noise.wrapS = noise.wrapT = RepeatWrapping;
  noise.minFilter = noise.magFilter = LinearFilter;
  const meshRef = useRef<typeof Mesh>(null);

  const material = useMemo(() => {
    const mat = new MeshStandardNodeMaterial({ color: "#ff0000" });
    const n = mul(
      texture(noise, normalGeometry.add(time.mul(0.1)))
        .r.sub(0.5)
        .mul(2),
      0.1,
    );
    mat.positionNode = positionLocal.add(n.mul(normalGeometry).mul(2));
    return mat;
  }, []);

  let t = 0;
  useFrame(({ delta }) => {
    t += delta * 5;
    const scaleTarget = Math.abs(Math.sin(t));
    meshRef.current?.scale.set(scaleTarget, scaleTarget, scaleTarget);
    console.log(meshRef.current);
  });
  return (
    <mesh
      ref={meshRef}
      onFramed={(inView: boolean) => {
        console.log(inView ? "Object entered view" : "Object left view");
      }}
      position={[-1.5, 0, 0]}
      material={material}
    >
      <sphereGeometry args={[0.5, 32, 32]} />
    </mesh>
  );
};
