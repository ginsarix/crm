'use client';

import { useCallback, useEffect, useRef } from 'react';

export function useHeartbeat(connected: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const connectedRef = useRef(connected);
  connectedRef.current = connected; // sync every render, no stale closure in rAF

  const pendingSpikesRef = useRef(0);
  const rafRef = useRef(0);

  const setConnected = useCallback((value: boolean) => {
    connectedRef.current = value;
  }, []);

  const spike = useCallback(() => {
    pendingSpikesRef.current += 1;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    const W = canvas.width; // 80
    const H = canvas.height; // 24
    const MID = H / 2; // 12
    const N = 80;

    const points = new Float32Array(N).fill(MID);
    let spikePhase = -1; // negative = idle

    function getNextValue(): number {
      if (spikePhase < 0 && pendingSpikesRef.current > 0) {
        pendingSpikesRef.current -= 1;
        spikePhase = 0;
      }

      if (spikePhase >= 0) {
        const phase = spikePhase;
        spikePhase += 0.045;
        if (spikePhase >= 1) spikePhase = -1;

        if (phase < 0.15) return MID - (phase / 0.15) * 4;
        if (phase < 0.25) return MID - 4 + ((phase - 0.15) / 0.1) * 4;
        if (phase < 0.35) return MID - ((phase - 0.25) / 0.1) * (H * 0.75);
        if (phase < 0.45)
          return MID - H * 0.75 + ((phase - 0.35) / 0.1) * (H * 1.1);
        if (phase < 0.6)
          return MID + H * 0.35 - ((phase - 0.45) / 0.15) * (H * 0.35);
        return MID;
      }

      return MID + (Math.random() - 0.5) * 0.6;
    }

    function draw() {
      points.copyWithin(0, 1);
      points[N - 1] = getNextValue();

      ctx.clearRect(0, 0, W, H);

      const isConnected = connectedRef.current;
      const fullColor = isConnected ? '#1D9E75' : 'rgba(128,128,128,0.3)';

      const grad = ctx.createLinearGradient(0, 0, W, 0);
      if (isConnected) {
        grad.addColorStop(0, 'rgba(29,158,117,0)');
        grad.addColorStop(0.4, 'rgba(29,158,117,0.3)');
        grad.addColorStop(1, '#1D9E75');
      } else {
        grad.addColorStop(0, 'rgba(128,128,128,0)');
        grad.addColorStop(0.4, 'rgba(128,128,128,0.09)');
        grad.addColorStop(1, 'rgba(128,128,128,0.3)');
      }

      ctx.beginPath();
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      for (let i = 0; i < N; i++) {
        const x = i;
        const y = points[i] as number;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Cursor dot at the rightmost point
      ctx.beginPath();
      ctx.fillStyle = fullColor;
      ctx.arc(N - 1, points[N - 1] as number, 2, 0, Math.PI * 2);
      ctx.fill();

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { canvasRef, spike, setConnected };
}
