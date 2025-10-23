import p5 from "p5";
import { Boid } from "./boid";

export default function draw(p: p5) {
  const flock: Boid[] = [];

  return {
    setup() {
      for(let i = 0; i < 100; i++){
        flock.push(new Boid(p));
      }
    },
    draw() {
      // clear to transparent so the CSS background shows through
      if ((p as any).clear) (p as any).clear(); else p.background(0, 0);
      for (const boid of flock) {
        boid.flock(flock);
        boid.edges();
        boid.update();
        boid.show();
      }
    },
  };
}
