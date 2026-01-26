import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three/webgpu";
import { mrt, output, velocity, screenUV, texture, uv } from "three/tsl";
import { motionBlur } from "three/addons/tsl/display/MotionBlur.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { usePostProcessing } from "@react-three/fiber/webgpu";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";

export const PostProcessing = () => {
  usePostProcessing(
    // mainCB - receives full RootState, set outputNode explicitly
    ({ postProcessing, passes, uniforms }) => {
      // Get the rendered textures
      const beauty = passes.scenePass.getTextureNode();
      const vel = passes.scenePass.getTextureNode("velocity");

      // Use blurAmount from uniforms (or from outer scope via closure)
      const bloomPass = bloom(beauty, 0.25, 0, 0);
      const blurNode = 1;
      const mBlur = beauty.add(bloomPass);

      // Add vignette effect for polish
      // Creates a darkening at the edges of the screen
      const vignette = screenUV
        .distance(0.5)
        .remap(0.6, 1)
        .mul(2)
        .clamp()
        .oneMinus();

      // Explicitly set the output node
      postProcessing.outputNode = mBlur.mul(vignette);
      postProcessing.outputNode;

      // Return passes to share (optional)
      return { beauty, velocity: vel, motionBlur: mBlur };
    },
    // setupCB - configure MRT on the default scenePass
    ({ passes }) => {
      passes.scenePass.setMRT(
        mrt({
          output,
          velocity,
        }),
      );
    },
  );

  return null;
};
