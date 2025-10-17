// src/components/P5Draw.tsx
import p5 from "p5";
import { useEffect, useRef } from "react";

type P5DrawFn = (p: p5) => { setup?: () => void; draw?: () => void } | void;

// A normal React functional component
export default function P5Draw({
  draw,   // the p5 "draw" function you pass in
  width = 600,
  height = 400,
}: {
  draw: P5DrawFn;
  width?: number;
  height?: number;
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
        // create the canvas and attach it to our <div>
        (p as any).createCanvas(width, height).parent(hostRef.current!);
        if (typeof userSetup === "function") userSetup.call(user);
      };

      if (typeof userDraw === "function") {
        p.draw = () => userDraw.call(user);
      }
    };

    // actually create the p5 instance
    instance = new p5(wrapped);

    // cleanup when React unmounts this component
    return () => instance?.remove();
  }, [draw, width, height]);

  // React renders this container div
  return <div ref={hostRef} />;
}
