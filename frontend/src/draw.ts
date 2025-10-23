import p5 from "p5";
import { Boid } from "./boid";

export default function makeDraw(boidCount: number) {
  return function draw(p: p5) {
  const flock: Boid[] = [];

  type Ripple = {
    x: number;
    y: number;
    t0: number;        // ms
    duration: number;  // ms
    rMax: number;
    band: number;
    strength: number;
  };
  const ripples: Ripple[] = [];

  return {
    setup() {
      for(let i = 0; i < boidCount; i++){
        flock.push(new Boid(p));
      }
      // Disruptive ripple on click/touch to scatter boids
      const spawn = (x: number, y: number) => {
        const minDim = Math.min(p.width, p.height);
        const rMax = minDim * 0.3; // smaller visual ripple
        ripples.push({
          x, y,
          t0: p.millis(),
          duration: 700,
          rMax,
          band: Math.max(8, Math.min(16, minDim * 0.015)),
          strength: 0.38, // stronger disruption
        });
      };
      const overControls = (x: number, y: number) => {
        const el = document.querySelector('.controls') as HTMLElement | null;
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      };
      p.mousePressed = () => { if (!overControls(p.mouseX, p.mouseY)) spawn(p.mouseX, p.mouseY); };
      (p as any).touchStarted = () => { const t0 = (p as any).touches && (p as any).touches[0]; if (t0 && !overControls(t0.x, t0.y)) spawn(t0.x, t0.y); };
    },
    draw() {
      // clear to transparent so the CSS background shows through
      if ((p as any).clear) (p as any).clear(); else p.background(0, 0);

      // Update, draw ripples, and prepare active wavefronts for force application
      const now = p.millis();
      const active: { x: number; y: number; r: number; band: number; strength: number }[] = [];
      if (ripples.length) {
        p.noFill();
        for (let i = ripples.length - 1; i >= 0; i--) {
          const rp = ripples[i];
          const t = (now - rp.t0) / rp.duration;
          if (t >= 1) { ripples.splice(i, 1); continue; }
          const ease = 1 - Math.pow(1 - t, 3);
          const r = rp.rMax * ease;
          const alpha = Math.max(0, 180 * (1 - t));
          p.stroke(255, alpha);
          p.strokeWeight(2 + 2 * (1 - t));
          p.circle(rp.x, rp.y, r * 2);
          active.push({ x: rp.x, y: rp.y, r, band: rp.band, strength: rp.strength });
        }
      }

      for (const boid of flock) {
        boid.flock(flock);

        // Apply ripple forces after flocking, before update
        if (active.length) {
          for (let i = 0; i < active.length; i++) {
            const a = active[i];
            const dx = boid.position.x - a.x;
            const dy = boid.position.y - a.y;
            const d = Math.hypot(dx, dy);
            if (d <= 1e-3) continue;
            // Inner blast: strong outward push inside current radius
            if (d < a.r) {
              const mInner = 1 - (d / a.r);
              if (mInner > 0) {
                const fInner = a.strength * mInner * mInner;
                boid.acceleration.x += (dx / d) * fInner;
                boid.acceleration.y += (dy / d) * fInner;
              }
            } else {
              // Thin ring band push near wavefront
              const delta = Math.abs(d - a.r);
              if (delta < a.band) {
                const m = 1 - (delta / a.band);
                const f = a.strength * 0.5 * m;
                boid.acceleration.x += (dx / d) * f;
                boid.acceleration.y += (dy / d) * f;
              }
            }
          }
        }

        boid.edges();
        boid.update();
        boid.show();
      }
    },
  };
  };
}
