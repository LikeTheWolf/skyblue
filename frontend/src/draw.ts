import p5 from "p5";
import { Boid } from "./boid";

export default function draw(p: p5) {
  const flock: Boid[] = [];

  return {
    setup() {
      for(let i = 0; i < 200; i++){
        flock.push(new Boid(p));
      }
    },
    draw() {
      p.background(51);
      for (const boid of flock) {
        boid.flock(flock);
        boid.edges();
        boid.update();
        boid.show();
      }
    },
  };
}
