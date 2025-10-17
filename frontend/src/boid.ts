import p5 from "p5";

export class Boid {
  private p: p5;
  position: p5.Vector;
  velocity: p5.Vector;
  acceleration: p5.Vector;
  maxForce: number;
  maxSpeed: number;

  constructor(p: p5) {
    this.p = p;
    // createCanvas has already run, so width/height are valid
    this.position = p.createVector(p.random(p.width), p.random(p.height));
    this.velocity = p5.Vector.random2D();
    this.velocity.setMag(p.random(2, 4));
    this.acceleration = p.createVector();
    this.maxForce = 0.1;
    this.maxSpeed = 5;
  }

  edges(){
    if(this.position.x > this.p.width){
      this.position.x = 0;
    } else if(this.position.x < 0){
      this.position.x = this.p.width;
    }
    if(this.position.y > this.p.height){
      this.position.y = 0;
    } else if(this.position.y < 0){
      this.position.y = this.p.height;
    }
  }

  align(boids: Boid[]){
    let perceptionRadius = 70;
    let steering = this.p.createVector();
    let total = 0;

    for(let other of boids){
      let d = this.p.dist(this.position.x, this.position.y, other.position.x, other.position.y);
      if(other !== this && d < perceptionRadius){
        steering.add(other.velocity);
        total++;        
      }
    }

    if(total > 0){
      steering.div(total);
      steering.setMag(this.maxSpeed);
      steering.sub(this.velocity);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  cohesion(boids: Boid[]){
    let perceptionRadius = 50;
    let steering = this.p.createVector();
    let total = 0;

    for(let other of boids){
      let d = this.p.dist(this.position.x, this.position.y, other.position.x, other.position.y);
      if(other !== this && d < perceptionRadius){
        steering.add(other.position);
        total++;        
      }
    }

    if(total > 0){
      steering.div(total);
      steering.sub(this.position);
      steering.setMag(this.maxSpeed);
      steering.sub(this.velocity);
      steering.limit(this.maxForce);
    }
    return steering;
  }

  separation(boids: Boid[]){
    let perceptionRadius = 25;
    let steering = this.p.createVector();
    let total = 0;

    for(let other of boids){
      let d = this.p.dist(this.position.x, this.position.y, other.position.x, other.position.y);
      if(other !== this && d < perceptionRadius){
        let diff = p5.Vector.sub(this.position, other.position);
        diff.div(d);
        steering.add(diff);
        total++;        
      }
    }

    if(total > 0){
      steering.div(total);
      steering.setMag(this.maxSpeed);
      steering.sub(this.velocity);
      steering.limit(2 * this.maxForce);
    }
    return steering;
  }

  flock(boids: Boid[]){
    this.acceleration.mult(0);
    let alignment = this.align(boids);
    let cohesion = this.cohesion(boids);
    let separation = this.separation(boids);
    this.acceleration.add(alignment);
    this.acceleration.add(cohesion);
    this.acceleration.add(separation);
  }

  update(): void {
    this.velocity.add(this.acceleration);
    this.position.add(this.velocity);
    this.velocity.limit(this.maxSpeed);
  }

  show(): void {
    const p = this.p;
    p.strokeWeight(4);
    p.stroke(255);
    // p.point expects (x, y), not a Vector
    p.point(this.position.x, this.position.y);
  }
}
