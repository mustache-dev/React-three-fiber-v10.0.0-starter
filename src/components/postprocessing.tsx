import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three/webgpu";
import { pass, mrt, output, velocity, uniform } from "three/tsl";
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

    const scenePassColor = scenePass.getTextureNode("output"); // Your scene's color
    const scenePassVelocity = scenePass.getTextureNode("velocity"); // needed for GTAO, motionBlur or TRAA

    const bloomPass = scenePassColor.add(bloom(scenePassColor, 0.25, 0., 0.)) // strength, radius, threshold
    bloomPass._nMips = 2; // secret sauce

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
