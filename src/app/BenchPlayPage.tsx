import { useEffect, useState } from 'react';

import { BoardShell } from './BoardShell';
import { framesPerSecondOverWindow } from './bench/bench-statistics';
import { denseBenchDocument } from './bench/dense-bench-document';

const WINDOW_MILLISECONDS = 1_000;
/** How far back the lowest one-second rate is remembered. */
const HISTORY_MILLISECONDS = 10_000;
const REFRESH_MILLISECONDS = 250;

interface FrameRate {
  readonly current: number;
  readonly lowest: number | null;
}

/** Counts real `requestAnimationFrame` callbacks: what the player actually sees. */
function useFrameRate(): FrameRate {
  const [rate, setRate] = useState<FrameRate>({ current: 0, lowest: null });

  useEffect(() => {
    if (typeof requestAnimationFrame !== 'function') return undefined;
    const timestamps: number[] = [];
    const samples: { readonly time: number; readonly value: number }[] = [];
    let lastRefresh = 0;
    let frameId = requestAnimationFrame(function onFrame(time) {
      timestamps.push(time);
      while (timestamps.length > 0 && (timestamps[0] ?? time) < time - WINDOW_MILLISECONDS * 2) {
        timestamps.shift();
      }
      if (time - lastRefresh >= REFRESH_MILLISECONDS) {
        lastRefresh = time;
        const current = framesPerSecondOverWindow(timestamps, WINDOW_MILLISECONDS);
        if (current > 0) samples.push({ time, value: current });
        while (samples.length > 0 && (samples[0]?.time ?? time) < time - HISTORY_MILLISECONDS) {
          samples.shift();
        }
        const lowest = samples.length === 0 ? null : Math.min(...samples.map(({ value }) => value));
        setRate({ current, lowest });
      }
      frameId = requestAnimationFrame(onFrame);
    });
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);

  return rate;
}

/** `/bench/play`: the dense scene on the shared board, with a frame-rate meter. */
export function BenchPlayPage() {
  const { current, lowest } = useFrameRate();

  return (
    <>
      <BoardShell
        initialDocument={denseBenchDocument}
        mode="resolution"
        title="Mesure · scène dense"
        subtitle="Appuyez sur Tester et lisez le minimum"
      />
      <p className="bench-frame-meter" role="status" aria-label="Images par seconde">
        Images/s : {current} · minimum sur 10 s : {lowest ?? '—'}
      </p>
    </>
  );
}
