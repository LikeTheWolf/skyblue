// src/components/P5Draw.tsx
import p5 from "p5";
import { useEffect, useRef } from "react";

type P5DrawFn = (p: p5) => { setup?: () => void; draw?: () => void } | void;

// A normal React functional component
export default function P5Draw({
  draw,
}: {
  draw: P5DrawFn;
}) {
  // a <div> we'll attach the p5 canvas into
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // this runs once when the component mounts
    let instance: p5 | undefined;

    // wraps your draw function in a safe p5 instance
    const wrapped = (p: p5) => {
      const user = draw(p) || {};
      const userSetup = (user as any).setup;
      const userDraw = (user as any).draw;

      p.setup = () => {
        // create a responsive canvas and attach it to our <div>
        const host = hostRef.current!;
        const rect = host.getBoundingClientRect();
        const w = Math.max(1, Math.floor(rect.width || window.innerWidth));
        const h = Math.max(1, Math.floor(rect.height || window.innerHeight));
        (p as any).createCanvas(w, h).parent(host);
        // cap pixel density for performance on mobile
        try { p.pixelDensity(Math.min(2, window.devicePixelRatio || 1)); } catch {}
        if (typeof userSetup === "function") userSetup.call(user);
      };

      if (typeof userDraw === "function") {
        p.draw = () => userDraw.call(user);
      }
    };

    // actually create the p5 instance
    instance = new p5(wrapped);

    // handle resize of the host to keep canvas full-bleed
    let ro: ResizeObserver | undefined;
    if (hostRef.current && 'ResizeObserver' in window) {
      ro = new ResizeObserver(() => {
        const host = hostRef.current!;
        const rect = host.getBoundingClientRect();
        if ((instance as any)?.resizeCanvas) {
          (instance as any).resizeCanvas(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)));
        }
      });
      ro.observe(hostRef.current);
    }

    // cleanup when React unmounts this component
    return () => { ro?.disconnect(); instance?.remove(); };
  }, [draw]);

  // React renders this container div
  return <div ref={hostRef} style={{ width: '100%', height: '100%' }} />;
}
