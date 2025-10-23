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

      const bottom = p.color(135, 206, 250);  // light blue
      const top = p.color(255, 255, 255); // near white
        drawGradient(p, top, bottom);      
        for (const boid of flock) {
          boid.flock(flock);
          boid.edges();
          boid.update();
          boid.show();
        }
    },
  };
}

function drawGradient(p:any, top:any, bottom:any) {
  for (let y = 0; y < p.height; y++) {
    const inter = p.map(y, 0, p.height, 0, 1);
    const c = p.lerpColor(top, bottom, inter);
    p.stroke(c);
    p.line(0, y, p.width, y);
  }
}
