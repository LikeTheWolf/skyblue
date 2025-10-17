import './App.css';
import P5Draw from './components/P5Draw';
import draw from "./draw";

function App() {
  return (
    <div style={{ padding: 16 }}>
      <h1>Flocking Simulation</h1>
      <P5Draw draw={draw} width={640} height={480} />
    </div>
  );
}

export default App;
