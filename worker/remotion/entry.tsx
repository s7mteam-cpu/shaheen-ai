// Remotion entry used by the worker to render motion-graphics videos to MP4.
import React from "react";
import "@fontsource/cairo/arabic-400.css";
import "@fontsource/cairo/arabic-600.css";
import "@fontsource/cairo/arabic-700.css";
import "@fontsource/cairo/arabic-800.css";
import "@fontsource/cairo/arabic-900.css";
import "@fontsource/cairo/latin-400.css";
import "@fontsource/cairo/latin-700.css";
import "@fontsource/cairo/latin-800.css";
import "@fontsource/tajawal/arabic-500.css";
import "@fontsource/tajawal/arabic-800.css";
import "@fontsource/almarai/arabic-400.css";
import "@fontsource/almarai/arabic-800.css";
import "@fontsource/changa/arabic-500.css";
import "@fontsource/changa/arabic-700.css";
import "@fontsource/amiri/arabic-400.css";
import "@fontsource/amiri/arabic-700.css";
import "@fontsource/amiri-quran/arabic-400.css";
import { Composition, Still, registerRoot } from "remotion";
import { DesignStill } from "../../src/design/Design";
import { DSIZE, type DesignSpec } from "../../src/design/spec";
import { MotionVideo } from "../../src/remotion/MotionVideo";
import { FPS, SAMPLE, dimensions, type MotionSpec } from "../../src/remotion/spec";
import { MontageVideo } from "../../src/remotion/MontageVideo";
import { MFPS, totalFrames, type MontageSpec } from "../../src/remotion/montage";
import { QuranVideo } from "../../src/remotion/QuranVideo";
import { QFPS, qDims, qFrames, type QuranSpec } from "../../src/remotion/quran";

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
    <Composition
      id="Quran"
      component={QuranVideo as unknown as React.FC<Record<string, unknown>>}
      fps={QFPS}
      durationInFrames={QFPS * 10}
      width={1080}
      height={1920}
      defaultProps={{} as Record<string, unknown>}
      calculateMetadata={({ props }) => {
        const p = props as unknown as QuranSpec;
        return { durationInFrames: qFrames(p), ...qDims(p.aspect) };
      }}
    />
    <Still
      id="Design"
      component={DesignStill as unknown as React.FC<Record<string, unknown>>}
      width={1080}
      height={1350}
      defaultProps={{} as Record<string, unknown>}
      calculateMetadata={({ props }) => {
        const p = props as unknown as { spec: DesignSpec };
        return DSIZE[p.spec?.aspect ?? "4:5"];
      }}
    />
    </>
  );
}

registerRoot(Root);
