// Remotion entry used by the worker to render motion-graphics videos to MP4.
import React from "react";
import "@fontsource/cairo/arabic-400.css";
import "@fontsource/cairo/arabic-600.css";
import "@fontsource/cairo/arabic-700.css";
import "@fontsource/cairo/arabic-800.css";
import "@fontsource/tajawal/arabic-500.css";
import "@fontsource/tajawal/arabic-800.css";
import "@fontsource/almarai/arabic-400.css";
import "@fontsource/almarai/arabic-800.css";
import "@fontsource/changa/arabic-500.css";
import "@fontsource/changa/arabic-700.css";
import "@fontsource/amiri/arabic-400.css";
import "@fontsource/amiri/arabic-700.css";
import { Composition, registerRoot } from "remotion";
import { MotionVideo } from "../../src/remotion/MotionVideo";
import { FPS, SAMPLE, dimensions, type MotionSpec } from "../../src/remotion/spec";
import { MontageVideo } from "../../src/remotion/MontageVideo";
import { MFPS, totalFrames, type MontageSpec } from "../../src/remotion/montage";

function Root() {
  return (
    <>
    <Composition
      id="Motion"
      component={MotionVideo as unknown as React.FC<Record<string, unknown>>}
      fps={FPS}
      durationInFrames={SAMPLE.seconds * FPS}
      {...dimensions(SAMPLE.aspect)}
      defaultProps={SAMPLE as unknown as Record<string, unknown>}
      calculateMetadata={({ props }) => {
        const p = props as unknown as MotionSpec;
        return { durationInFrames: Math.round(p.seconds * FPS), ...dimensions(p.aspect) };
      }}
    />
    <Composition
      id="Montage"
      component={MontageVideo as unknown as React.FC<Record<string, unknown>>}
      fps={MFPS}
      durationInFrames={MFPS * 10}
      width={1080}
      height={1920}
      defaultProps={{} as Record<string, unknown>}
      calculateMetadata={({ props }) => {
        const p = props as unknown as MontageSpec;
        return { durationInFrames: totalFrames(p), ...dimensions(p.aspect) };
      }}
    />
    </>
  );
}

registerRoot(Root);
