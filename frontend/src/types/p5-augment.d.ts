import 'p5';

declare module 'p5' {
  // Augment instance members used in instance mode
  interface p5 {
    width: number;
    height: number;
    createVector(x: number, y: number): p5.Vector;
    createVector(x: number, y: number, z: number): p5.Vector;
  }
}

