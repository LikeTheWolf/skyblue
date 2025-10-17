# 🐦 React + p5.js Boids Simulation

This is a simple **Boids simulation** built with **React**, **TypeScript**, and **p5.js**.  
It visualizes the flocking behavior first described by **Craig Reynolds (1986)** — showing how complex group motion can emerge from a few simple rules.

---

## 🧠 The Three Core Principles

Each *boid* (bird-like agent) follows three steering behaviors:

1. **Separation** – avoid crowding nearby flockmates.  
   → Each boid steers away if others are too close.

2. **Alignment** – match velocity with nearby flockmates.  
   → Boids tend to turn and move in the same direction.

3. **Cohesion** – move toward the average position of neighbors.  
   → Boids steer gently toward the center of the group.

When all three behaviors combine, the flock exhibits lifelike, fluid movement — without any global coordination.

---

## 🧩 Implementation Overview

- **React + TypeScript** provides the app structure and modular code.
- **p5.js** handles drawing and vector math.
- A small **React wrapper component (`P5Sketch`)** integrates p5 safely inside React’s lifecycle.
- Each `Boid` instance has:
  - A `position`, `velocity`, and `acceleration` (p5.Vector objects).
  - An `update()` and `show()` method.
- The `draw` loop updates and renders all boids at each frame.

---


