import './App.css';
import P5Draw from './components/P5Draw';
import makeDraw from "./draw";
import { useMemo, useState } from 'react';

function App() {
  const [boids, setBoids] = useState<number>(100);
  const draw = useMemo(() => makeDraw(boids), [boids]);

  return (
    <div className="app-root">
      <P5Draw draw={draw} />
      <div className="brand">Flocking Simulation</div>
      <div className="controls" role="group" aria-label="Boid count">
        <span className="ctrl-label" aria-hidden>Boids</span>
        <button
          className={`ctrl-btn ${boids === 100 ? 'active' : ''}`}
          aria-pressed={boids === 100}
          onClick={() => setBoids(100)}
          aria-label="Set to 100 boids"
          title="Set to 100 boids"
        >100</button>
        <button
          className={`ctrl-btn ${boids === 250 ? 'active' : ''}`}
          aria-pressed={boids === 250}
          onClick={() => setBoids(250)}
          aria-label="Set to 250 boids"
          title="Set to 250 boids"
        >250</button>
        <button
          className={`ctrl-btn ${boids === 500 ? 'active' : ''}`}
          aria-pressed={boids === 500}
          onClick={() => setBoids(500)}
          aria-label="Set to 500 boids"
          title="Set to 500 boids"
        >500</button>
      </div>
    </div>
  );
}

export default App;
