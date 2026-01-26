import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useLocalNodes } from "@react-three/fiber/webgpu";
import { useMemo, useRef } from "react";
import {
  normalGeometry,
  positionLocal,
  sin,
  texture,
  time,
  mul,
  pow,
  dot,
  positionViewDirection,
  vec3,
  normalView,
  normalize,
  vec2,
  fract,
} from "three/tsl";
import {
  MeshStandardNodeMaterial,
  RepeatWrapping,
  TextureLoader,
  LinearFilter,
  Mesh,
} from "three/webgpu";

export const WobblySphere = () => {
  const noise = useLoader(TextureLoader, "./noise.png");
  noise.wrapS = noise.wrapT = RepeatWrapping;
  noise.minFilter = noise.magFilter = LinearFilter;
  const meshRef = useRef<typeof Mesh>(null);

  const { n } = useLocalNodes(() => ({
    n: mul(
      texture(noise, normalGeometry.add(time.mul(0.1)))
        .r.sub(0.5)
        .mul(3),
      0.1,
    ),
  }));

  const rainbow = useLoader(TextureLoader, "rainbow-2.jpg");

  const colorNode = useMemo(() => {
    const fresnel = pow(
      dot(normalize(positionViewDirection), normalize(normalView)).oneMinus(),
      1,
    );

    const col = texture(rainbow, vec2(fract(fresnel.sub(time.mul(1)))));

    return vec3(pow(col, vec3(2)));
  }, []);

  let t = 0;
  useFrame(({ delta }) => {
    t += delta;
    meshRef.current.position.y = Math.sin(t * 4);
    meshRef.current.scale.y = 1 + Math.cos(t * 4) * 0.2;
  });
  return (
    <mesh
      ref={meshRef}
      onFramed={(inView: boolean) => {
        console.log(inView ? "Object entered view" : "Object left view");
      }}
      position={[1.5, 0, 0]}
    >
      <sphereGeometry args={[0.5, 128, 128]} />
      <meshStandardNodeMaterial
        positionNode={positionLocal.add(n.mul(normalGeometry).mul(2))}
        color={"#FF0000"}
        colorNode={colorNode}
        roughness={0.8}
      />
    </mesh>
  );
};
