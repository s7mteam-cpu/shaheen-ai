"use client";
import "@fontsource/cairo/900.css";
import { Thumbnail } from "@remotion/player";
import { DesignStill } from "@/design/Design";
import { DSIZE, type DesignSpec } from "@/design/spec";

/** Live, scaled preview of one slide (same component the worker renders to PNG). */
export function DesignView({ spec, index, className }: { spec: DesignSpec; index: number; className?: string }) {
  const { width, height } = DSIZE[spec.aspect];
  return (
    <div dir="ltr" className={className} style={{ aspectRatio: `${width} / ${height}`, width: "100%" }}>
      <Thumbnail
        component={DesignStill as never}
        inputProps={{ spec, index }}
        compositionWidth={width}
        compositionHeight={height}
        frameToDisplay={0}
        durationInFrames={1}
        fps={30}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
