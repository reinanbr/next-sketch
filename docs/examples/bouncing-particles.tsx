'use client';

import { useRef } from 'react';
import { CanvasSketch, lerpColor, randRange } from 'next-sketch';
import type { CanvasSketchHandle } from 'next-sketch';

interface Particle {
  x: number; y: number; vx: number; vy: number; r: number;
}

const COLD: [number, number, number] = [59, 130, 246];
const HOT: [number, number, number] = [239, 68, 68];

export default function BouncingParticles() {
  const particles = useRef<Particle[]>([]);
  const sketchRef = useRef<CanvasSketchHandle>(null);

  return (
    <div>
      <CanvasSketch
        ref={sketchRef}
        style={{ width: '100%', height: 400, background: '#0f172a' }}
        setup={({ width, height }) => {
          particles.current = Array.from({ length: 60 }, () => ({
            x: randRange(0, width),
            y: randRange(0, height),
            vx: randRange(-60, 60),
            vy: randRange(-60, 60),
            r: randRange(3, 7),
          }));
        }}
        draw={({ ctx, width, height, dt }) => {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, width, height);

          for (const p of particles.current) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.x < p.r || p.x > width - p.r) p.vx *= -1;
            if (p.y < p.r || p.y > height - p.r) p.vy *= -1;

            const speed = Math.hypot(p.vx, p.vy);
            ctx.fillStyle = lerpColor(COLD, HOT, speed / 120);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
          }
        }}
      />
      <button onClick={() => sketchRef.current?.isRunning() ? sketchRef.current.stop() : sketchRef.current?.start()}>
        Play / Pause
      </button>
    </div>
  );
}
