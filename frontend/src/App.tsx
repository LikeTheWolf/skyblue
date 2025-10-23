import './App.css';
import P5Draw from './components/P5Draw';
import draw from "./draw";

function App() {
  return (
    <div className="app-root">
      <P5Draw draw={draw} />
      <div className="brand">Flocking Simulation</div>
    </div>
  );
}

export default App;
