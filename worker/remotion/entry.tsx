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

function Root() {
  return (
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
  );
}

registerRoot(Root);
