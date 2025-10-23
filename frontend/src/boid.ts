import p5 from "p5";

export class Boid {
  private p: p5;
  position: p5.Vector;
  velocity: p5.Vector;
  acceleration: p5.Vector;
  maxForce: number;
  maxSpeed: number;
  cruiseSpeed: number;
  throttleGain: number; // 0..1 per frame
  maxTurnRate: number; // radians per frame
  fov: number; // radians for forward vision
  neighborCount: number; // topological neighbor cap

  constructor(p: p5) {
    this.p = p;
    // createCanvas has already run, so width/height are valid
    this.position = p.createVector(p.random(p.width), p.random(p.height));
    this.velocity = p5.Vector.random2D();
    this.velocity.setMag(p.random(2, 4));
    this.acceleration = p.createVector();
    this.maxForce = 0.1;
    this.maxSpeed = 2.3;
    this.cruiseSpeed = 2.0;
    this.throttleGain = 0.05;
    this.maxTurnRate = this.p.radians(10);
    this.fov = this.p.radians(150);
    this.neighborCount = 5;

    // slight heterogeneity per boid for more organic motion
    const vary = (v: number, pct = 0.1) => v * this.p.random(1 - pct, 1 + pct);
    this.cruiseSpeed = vary(this.cruiseSpeed, 0.1);
    this.maxForce = vary(this.maxForce, 0.1);
    this.maxTurnRate = vary(this.maxTurnRate, 0.2);
  }

  edges(){
    // Look-ahead plus gentle proximity push to avoid walls naturally
    const margin = 60;
    const lookAhead = 50;
    const { width, height } = this.p;
    const velDir = this.velocity.copy();
    if (velDir.magSq() > 0) velDir.normalize();
    const future = this.p.createVector(
      this.position.x + velDir.x * lookAhead,
      this.position.y + velDir.y * lookAhead
    );

    const steer = this.p.createVector(0, 0);

    // Proximity push
    if (this.position.x < margin) steer.x += (margin - this.position.x) / margin;
    if (this.position.x > width - margin) steer.x -= (this.position.x - (width - margin)) / margin;
    if (this.position.y < margin) steer.y += (margin - this.position.y) / margin;
    if (this.position.y > height - margin) steer.y -= (this.position.y - (height - margin)) / margin;

    // Look-ahead banking lateral to velocity if crossing boundary soon
    if (future.x < 0 || future.x > width) {
      const lateral = this.p.createVector(-velDir.y, velDir.x);
      lateral.mult(this.maxForce * 0.8 * (future.x < 0 ? 1 : -1));
      steer.add(lateral);
    }
    if (future.y < 0 || future.y > height) {
      const lateral = this.p.createVector(velDir.y, -velDir.x);
      lateral.mult(this.maxForce * 0.8 * (future.y < 0 ? 1 : -1));
      steer.add(lateral);
    }

    if (steer.magSq() > 0) {
      steer.limit(this.maxForce);
      this.acceleration.add(steer);
    }
  }

  private inFOV(toPos: p5.Vector): boolean {
    const to = p5.Vector.sub(toPos, this.position);
    if (to.magSq() === 0) return false;
    const forward = this.velocity.copy();
    if (forward.magSq() === 0) return true;
    to.normalize();
    forward.normalize();
    const dot = forward.dot(to);
    const angle = Math.acos(this.p.constrain(dot, -1, 1));
    return angle <= this.fov / 2;
  }

  private steeringFromNeighbors(
    boids: Boid[],
    radius: number,
    accumulate: (acc: p5.Vector, other: Boid, dOrD2: number) => void,
    options?: { postAverage?: (acc: p5.Vector) => void; forceLimit?: number; useFOV?: boolean; limitN?: number; normalizeToMaxSpeed?: boolean; subtractVelocity?: boolean }
  ): p5.Vector {
    const p = this.p;
    const steering = p.createVector();
    const limit = options?.limitN ?? boids.length;
    const k = limit;
    const bestIdx: number[] = new Array(k).fill(-1);
    const bestD2: number[] = new Array(k).fill(Infinity);

    const radius2 = radius * radius;
    // Precompute FOV dot threshold (squared) and forward unit if needed
    let fx = 0, fy = 0, cosHalf2 = 0, useFOV = !!options?.useFOV;
    if (useFOV) {
      const mag = this.velocity.mag();
      if (mag > 0) {
        fx = this.velocity.x / mag;
        fy = this.velocity.y / mag;
      } else {
        useFOV = false; // no forward if not moving
      }
      const cosHalf = Math.cos(this.fov / 2);
      cosHalf2 = cosHalf * cosHalf;
    }

    // Scan all boids; track k smallest distances without sorting whole list
    for (let i = 0; i < boids.length; i++) {
      const other = boids[i];
      if (other === this) continue;
      const dx = this.position.x - other.position.x;
      const dy = this.position.y - other.position.y;
      const d2 = dx * dx + dy * dy;
      if (d2 === 0 || d2 >= radius2) continue;
      if (useFOV) {
        const dot = -(fx * dx + fy * dy); // since dx,dy = self - other, invert sign
        if (dot <= 0) continue; // behind
        // Compare squared to avoid sqrt: (dot^2 >= cos^2 * d2)
        if ((dot * dot) < (cosHalf2 * d2)) continue;
      }
      // find worst slot
      let worst = 0;
      for (let j = 1; j < k; j++) {
        if (bestD2[j] > bestD2[worst]) worst = j;
      }
      if (d2 < bestD2[worst]) {
        bestD2[worst] = d2;
        bestIdx[worst] = i;
      }
    }

    // Build selected list from best arrays (filter out empty slots)
    const selectedIdx: number[] = [];
    for (let j = 0; j < k; j++) if (bestIdx[j] !== -1) selectedIdx.push(bestIdx[j]);
    // Randomly drop a neighbor or two to avoid rigid consensus
    let selected = selectedIdx.filter(() => this.p.random() > 0.25);
    if (selected.length === 0 && selectedIdx.length > 0) selected = [selectedIdx[0]];

    if (selected.length > 0) {
      for (let s = 0; s < selected.length; s++) {
        const idx = selected[s];
        const other = boids[idx];
        // Recompute squared distance (cheap) for accumulator
        const dx = this.position.x - other.position.x;
        const dy = this.position.y - other.position.y;
        const d2 = dx * dx + dy * dy;
        accumulate(steering, other, d2);
      }
      steering.div(selected.length);
      if (options?.postAverage) options.postAverage(steering);
      if (options?.normalizeToMaxSpeed) steering.setMag(this.maxSpeed);
      if (options?.subtractVelocity ?? true) {
        steering.sub(this.velocity);
      }
      steering.limit(options?.forceLimit ?? this.maxForce);
    }
    return steering;
  }

  align(boids: Boid[]): p5.Vector {
    return this.steeringFromNeighbors(
      boids,
      70,
      (acc, other) => { acc.add(other.velocity); },
      { useFOV: true, limitN: this.neighborCount, normalizeToMaxSpeed: false, postAverage: (acc) => {
        // steer toward average heading with modest magnitude
        if (acc.magSq() > 0) acc.setMag(this.cruiseSpeed * 0.7);
      }}
    );
  }

  cohesion(boids: Boid[]): p5.Vector {
    return this.steeringFromNeighbors(
      boids,
      60,
      (acc, other) => { acc.add(other.position); },
      { postAverage: (acc) => {
          acc.sub(this.position);
          if (acc.magSq() > 0) acc.setMag(this.cruiseSpeed * 0.4);
        }, useFOV: true, limitN: this.neighborCount, normalizeToMaxSpeed: false }
    );
  }

  separation(boids: Boid[]): p5.Vector {
    return this.steeringFromNeighbors(
      boids,
      40,
      (acc, other, d2) => {
        const diff = p5.Vector.sub(this.position, other.position);
        diff.div(d2 + 1e-6);
        acc.add(diff);
      },
      { forceLimit: 2 * this.maxForce, limitN: this.neighborCount, normalizeToMaxSpeed: false, useFOV: false, subtractVelocity: false }
    );
  }

  flock(boids: Boid[]){
    this.acceleration.mult(0);
    let alignment = this.align(boids);
    let cohesion = this.cohesion(boids);
    let separation = this.separation(boids);
    // Balance the three behaviors
    alignment.mult(0.7);
    cohesion.mult(0.5);
    separation.mult(2.0);

    this.acceleration.add(alignment);
    this.acceleration.add(cohesion);
    this.acceleration.add(separation);
    // Preserve relative strengths; avoid globally flattening short-range separation

    // Add tiny wander to prevent lockstep (perpendicular jitter)
    const v = this.velocity.copy();
    const wander = v.magSq() === 0 ? p5.Vector.random2D() : this.p.createVector(-v.y, v.x);
    if (wander.magSq() > 0) {
      wander.normalize();
      wander.mult(this.maxForce * 0.04 * this.p.random(-1, 1));
      this.acceleration.add(wander);
    }
  }

  private angleWrap(rad: number): number {
    return Math.atan2(Math.sin(rad), Math.cos(rad));
  }

  update(): void {
    const vPrev = this.velocity.copy();
    const vDesired = p5.Vector.add(this.velocity, this.acceleration);
    let vNext = vDesired.magSq() === 0 ? vPrev.copy() : vDesired;

    const prevH = vPrev.heading();
    const nextH = vNext.heading();
    const dTheta = this.angleWrap(nextH - prevH);
    if (Math.abs(dTheta) > this.maxTurnRate) {
      const clampedH = prevH + Math.sign(dTheta) * this.maxTurnRate;
      const speed = vNext.mag();
      vNext = p5.Vector.fromAngle(clampedH);
      vNext.setMag(speed);
    }

    // Gentle throttle towards cruise (no hard min speed)
    const speed = vNext.mag();
    const target = this.p.constrain(this.cruiseSpeed, 0, this.maxSpeed);
    const newSpeed = speed + (target - speed) * this.throttleGain;
    const minSpeed = Math.min(this.maxSpeed, Math.max(0.5, this.cruiseSpeed * 0.6));
    vNext.setMag(this.p.constrain(newSpeed, minSpeed, this.maxSpeed));

    // Predict next position and contain within bounds without hard bounce
    const nextPos = this.p.createVector(this.position.x + vNext.x, this.position.y + vNext.y);
    const { width, height } = this.p;

    if (nextPos.x < 0) {
      nextPos.x = 0;
      if (vNext.x < 0) vNext.x = 0; // slide along wall
    } else if (nextPos.x > width) {
      nextPos.x = width;
      if (vNext.x > 0) vNext.x = 0;
    }

    if (nextPos.y < 0) {
      nextPos.y = 0;
      if (vNext.y < 0) vNext.y = 0;
    } else if (nextPos.y > height) {
      nextPos.y = height;
      if (vNext.y > 0) vNext.y = 0;
    }

    this.velocity = vNext;
    this.position = nextPos;
  }

  show(): void {
    const p = this.p;
    const r = 2; // triangle size
    const angle = this.velocity.heading();

    p.push();
    p.translate(this.position.x, this.position.y);
    p.rotate(angle);
    p.noStroke();
    p.fill(255);
    // Triangle pointing along +X (nose forward)
    p.triangle(r * 2, 0, -r, -r, -r, r);
    p.pop();
  }
}
