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
    accumulate: (acc: p5.Vector, other: Boid, d: number) => void,
    options?: { postAverage?: (acc: p5.Vector) => void; forceLimit?: number; useFOV?: boolean; limitN?: number; normalizeToMaxSpeed?: boolean; subtractVelocity?: boolean }
  ): p5.Vector {
    const p = this.p;
    const steering = p.createVector();
    const pool: Array<{ other: Boid, d: number }> = [];

    for (const other of boids) {
      if (other === this) continue;
      const d = p.dist(this.position.x, this.position.y, other.position.x, other.position.y);
      if (d < radius) {
        if (!options?.useFOV || this.inFOV(other.position)) {
          pool.push({ other, d });
        }
      }
    }

    pool.sort((a, b) => a.d - b.d);
    const limit = options?.limitN ?? pool.length;
    const picked = pool.slice(0, limit);
    // Randomly drop a neighbor or two to avoid rigid consensus
    let selected = picked.filter(() => this.p.random() > 0.25);
    if (selected.length === 0 && picked.length > 0) selected = [picked[0]];

    if (selected.length > 0) {
      for (const { other, d } of selected) {
        accumulate(steering, other, d);
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
      (acc, other, d) => {
        const diff = p5.Vector.sub(this.position, other.position);
        diff.div(d * d + 1e-6);
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
    p.fill(55);
    // Triangle pointing along +X (nose forward)
    p.triangle(r * 2, 0, -r, -r, -r, r);
    p.pop();
  }
}
