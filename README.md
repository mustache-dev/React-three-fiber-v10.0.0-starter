# React Three Fiber v10 (alpha) starter

This is a minimal React + Vite starter that targets the brand‑new `@react-three/fiber` v10 alpha and `three` v0.182+. It is set up for fast iteration and a clean base for WebGL or WebGPU experiments.

For the new v10 APIs and behaviors referenced below, see the official v10 features doc. [v10 New Features](https://raw.githubusercontent.com/pmndrs/react-three-fiber/v10/docs/v10-features.md)

## Getting started

```bash
npm install
npm run dev
```

Other scripts:

```bash
npm run build
npm run preview
npm run lint
```

## Project structure

- `src/main.tsx` boots React and mounts the canvas.
- `src/App.tsx` is the root scene.
- `src/components/*` holds reusable scene components.
- `public/` contains static assets.

## Using React Three Fiber v10

The starter is compatible with the following v10 features and APIs. These are opt‑in examples you can copy into your scene components.

### Camera scene parenting

In v10, the default camera is automatically attached to the scene if it has no parent. This means camera‑attached UI (HUDs, reticles, cockpit meshes) will render correctly without extra plumbing. [v10 New Features](https://raw.githubusercontent.com/pmndrs/react-three-fiber/v10/docs/v10-features.md)

```tsx
import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

export function HUD() {
  const { camera } = useThree()
  const group = useRef<THREE.Group>(null)

  useEffect(() => {
    if (!group.current) return
    camera.add(group.current)
    return () => camera.remove(group.current)
  }, [camera])

  return (
    <group ref={group} position={[0, 0, -2]}>
      <mesh>
        <planeGeometry args={[0.5, 0.1]} />
        <meshBasicMaterial color="lime" transparent opacity={0.8} />
      </mesh>
    </group>
  )
}
```

### `useRenderTarget` for WebGL + WebGPU

v10 introduces `useRenderTarget`, which returns the correct render target class for the active renderer. This keeps your post‑processing and portal effects compatible across WebGL and WebGPU builds. [v10 New Features](https://raw.githubusercontent.com/pmndrs/react-three-fiber/v10/docs/v10-features.md)

```tsx
import { useFrame, useRenderTarget } from '@react-three/fiber'

function Portal() {
  const fbo = useRenderTarget(512, 512, { samples: 4 })

  useFrame(({ gl, scene, camera }) => {
    gl.setRenderTarget(fbo)
    gl.render(scene, camera)
    gl.setRenderTarget(null)
  })

  return (
    <mesh>
      <planeGeometry />
      <meshBasicMaterial map={fbo.texture} />
    </mesh>
  )
}
```

### Visibility events

v10 adds visibility events that fire on state changes, not every frame. Use them to pause animations, stream assets, or run analytics. [v10 New Features](https://raw.githubusercontent.com/pmndrs/react-three-fiber/v10/docs/v10-features.md)

```tsx
function FrustumAware() {
  return (
    <mesh
      onFramed={(inView) => {
        console.log(inView ? 'entered view' : 'left view')
      }}>
      <boxGeometry />
      <meshStandardMaterial />
    </mesh>
  )
}
```

### Camera frustum access

The root state exposes a synchronized `THREE.Frustum`, useful for custom culling or LOD logic. [v10 New Features](https://raw.githubusercontent.com/pmndrs/react-three-fiber/v10/docs/v10-features.md)

```tsx
import { useFrame, useThree } from '@react-three/fiber'

function VisibilityController({ objects }: { objects: THREE.Object3D[] }) {
  const { frustum } = useThree()

  useFrame(() => {
    for (const obj of objects) {
      obj.visible = frustum.intersectsObject(obj)
    }
  })

  return null
}
```

## Notes

- This starter targets `@react-three/fiber` `^10.0.0-alpha.1` and `three` `^0.182.0`.
- For WebGPU experiments, use the `@react-three/fiber/webgpu` entry in your imports if you want to force WebGPU builds.

## Credits

React Three Fiber by pmndrs. See the v10 features doc for the complete list of additions and migration guidance. [v10 New Features](https://raw.githubusercontent.com/pmndrs/react-three-fiber/v10/docs/v10-features.md)
