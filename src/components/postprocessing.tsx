import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three/webgpu";
import { pass, mrt, output, velocity, uniform, oneMinus, vec3, vec2, screenUV, length, smoothstep, float, clamp, step } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { smaa } from "three/examples/jsm/tsl/display/SMAANode.js";

export const PostProcessing = () => {
  const { renderer, scene, camera, size } = useThree();

  const postProcessingRef = useRef<THREE.PostProcessing>(null);

  // the postprocessing process is easy, take your scene Color
  // add whatever pass you want following the docs
  // motionBlur, GTAO, TRAA, SMAA, Bloom, DOF are pretty interesting and easy to use

  // TODO: create a color grading node, will show how to create custom pass as well, it's easy

  useEffect(() => {
    const scenePass = pass(scene, camera, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });

    scenePass.setMRT(
      mrt({
        output: output,
        velocity: velocity,
      }),
    );

    const center = vec2(0.5)
    const vignette = smoothstep(0., 0.5, oneMinus(length(screenUV.sub(center))).pow(2.))

    const scenePassColor = scenePass.getTextureNode("output").pow(1.2); // Your scene's color
    const scenePassVelocity = scenePass.getTextureNode("velocity"); // needed for GTAO, motionBlur or TRAA

    // Screen blend mode: 1 - (1 - base) * (1 - blend)
    // Gives a brighter, less blown-out result than additive
    const bloomResult = bloom(scenePassColor.mul(vignette), 0.15, 1, 0.) // strength, radius, threshold
    // bloomResult._nMips = 0; // secret sauce


    const a = float(2.51);
    const b = float(0.03);
    const c = float(2.43);
    const d = float(0.59);
    const e = float(0.14);
    const acesFilmic = clamp(
      scenePassColor.mul(scenePassColor.mul(a).add(b))
        .div(scenePassColor.mul(scenePassColor.mul(c).add(d)).add(e)),
      0.0,
      1.0)
    const bloomPass = smaa(acesFilmic).add(bloomResult)

    const finalOutput = bloomPass

    const postProcessing = new THREE.PostProcessing(renderer);
    postProcessing.outputNode = finalOutput;
    postProcessingRef.current = postProcessing;


    if (postProcessingRef.current.setSize) {
      postProcessingRef.current.setSize(size.width, size.height);
      postProcessingRef.current.needsUpdate = true;
    }
    return () => {
      postProcessingRef.current = null;
    };
  }, [renderer, scene, camera, size]);

  useFrame(({ renderer, scene, camera }) => {
    if (postProcessingRef.current) {
      renderer.clear();
      postProcessingRef.current.render();
    }
  }, 1);
  return null;
};
