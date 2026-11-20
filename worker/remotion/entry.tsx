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
import "@fontsource/aref-ruqaa/arabic-400.css";
import "@fontsource/aref-ruqaa/arabic-700.css";
import "@fontsource/aref-ruqaa-ink/arabic-400.css";
import "@fontsource/aref-ruqaa-ink/arabic-700.css";
import "@fontsource/katibeh/arabic-400.css";
import "@fontsource/reem-kufi/arabic-400.css";
import "@fontsource/reem-kufi/arabic-700.css";
import "@fontsource/el-messiri/arabic-400.css";
import "@fontsource/el-messiri/arabic-700.css";
import "@fontsource/mirza/arabic-400.css";
import "@fontsource/mirza/arabic-700.css";
import "@fontsource/tajawal/arabic-500.css";
import "@fontsource/tajawal/arabic-800.css";
import "@fontsource/almarai/arabic-400.css";
import "@fontsource/almarai/arabic-800.css";
import "@fontsource/changa/arabic-500.css";
import "@fontsource/changa/arabic-700.css";
import "@fontsource/amiri/arabic-400.css";
import "@fontsource/amiri/arabic-700.css";
import "@fontsource/amiri-quran/arabic-400.css";
import "@fontsource/tajawal/arabic-400.css";
import "@fontsource/tajawal/arabic-700.css";
import "@fontsource/tajawal/latin-400.css";
import "@fontsource/tajawal/latin-700.css";
import "@fontsource/almarai/arabic-400.css";
import "@fontsource/almarai/arabic-700.css";
import "@fontsource/almarai/latin-400.css";
import "@fontsource/almarai/latin-700.css";
import "@fontsource/changa/arabic-400.css";
import "@fontsource/changa/arabic-700.css";
import "@fontsource/changa/latin-400.css";
import "@fontsource/changa/latin-700.css";
import "@fontsource/amiri/arabic-400.css";
import "@fontsource/amiri/arabic-700.css";
import "@fontsource/amiri/latin-400.css";
import "@fontsource/amiri/latin-700.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-400.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-700.css";
import "@fontsource/noto-sans-arabic/arabic-400.css";
import "@fontsource/noto-sans-arabic/arabic-700.css";
import "@fontsource/readex-pro/arabic-400.css";
import "@fontsource/readex-pro/arabic-700.css";
import "@fontsource/vazirmatn/arabic-400.css";
import "@fontsource/vazirmatn/arabic-700.css";
import "@fontsource/alexandria/arabic-400.css";
import "@fontsource/alexandria/arabic-700.css";
import "@fontsource/mada/arabic-400.css";
import "@fontsource/mada/arabic-700.css";
import "@fontsource/rubik/arabic-400.css";
import "@fontsource/rubik/arabic-700.css";
import "@fontsource/zain/arabic-400.css";
import "@fontsource/zain/arabic-700.css";
import "@fontsource/fustat/arabic-400.css";
import "@fontsource/fustat/arabic-700.css";
import "@fontsource/cairo-play/arabic-400.css";
import "@fontsource/cairo-play/arabic-700.css";
import "@fontsource/harmattan/arabic-400.css";
import "@fontsource/harmattan/arabic-700.css";
import "@fontsource/lalezar/arabic-400.css";
import "@fontsource/rakkas/arabic-400.css";
import "@fontsource/baloo-bhaijaan-2/arabic-400.css";
import "@fontsource/baloo-bhaijaan-2/arabic-700.css";
import "@fontsource/jomhuria/arabic-400.css";
import "@fontsource/marhey/arabic-400.css";
import "@fontsource/marhey/arabic-700.css";
import "@fontsource/kufam/arabic-400.css";
import "@fontsource/kufam/arabic-700.css";
import "@fontsource/handjet/arabic-400.css";
import "@fontsource/handjet/arabic-700.css";
import "@fontsource/lemonada/arabic-400.css";
import "@fontsource/lemonada/arabic-700.css";
import "@fontsource/noto-kufi-arabic/arabic-400.css";
import "@fontsource/noto-kufi-arabic/arabic-700.css";
import "@fontsource/reem-kufi-fun/arabic-400.css";
import "@fontsource/reem-kufi-fun/arabic-700.css";
import "@fontsource/reem-kufi-ink/arabic-400.css";
import "@fontsource/blaka/arabic-400.css";
import "@fontsource/blaka-ink/arabic-400.css";
import "@fontsource/blaka-hollow/arabic-400.css";
import "@fontsource/noto-naskh-arabic/arabic-400.css";
import "@fontsource/noto-naskh-arabic/arabic-700.css";
import "@fontsource/scheherazade-new/arabic-400.css";
import "@fontsource/scheherazade-new/arabic-700.css";
import "@fontsource/lateef/arabic-400.css";
import "@fontsource/lateef/arabic-700.css";
import "@fontsource/markazi-text/arabic-400.css";
import "@fontsource/markazi-text/arabic-700.css";
import "@fontsource/gulzar/arabic-400.css";
import "@fontsource/alkalami/arabic-400.css";
import "@fontsource/ruwudu/arabic-400.css";
import "@fontsource/ruwudu/arabic-700.css";
import "@fontsource/qahiri/arabic-400.css";
import "@fontsource/vibes/arabic-400.css";
import "@fontsource/playpen-sans-arabic/arabic-400.css";
import "@fontsource/playpen-sans-arabic/arabic-700.css";
import "@fontsource/noto-nastaliq-urdu/arabic-400.css";
import "@fontsource/noto-nastaliq-urdu/arabic-700.css";
import { Composition, Still, registerRoot } from "remotion";
import { CVStill } from "../../src/cv/CV";
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
    <Still
      id="CV"
      component={CVStill as unknown as React.FC<Record<string, unknown>>}
      width={794}
      height={1123}
      defaultProps={{} as Record<string, unknown>}
    />
    </>
  );
}

registerRoot(Root);
