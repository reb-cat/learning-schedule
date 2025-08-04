import { createRoot } from 'react-dom/client'
import './index.css'

console.log('🔥 Main.tsx is executing');

const SimpleApp = () => {
  console.log('🎯 SimpleApp rendering');
  return (
    <div style={{ padding: '20px', backgroundColor: 'green', color: 'white', fontSize: '24px' }}>
      <h1>SIMPLE APP COMPONENT - WORKING</h1>
      <p>Testing App component rendering</p>
    </div>
  );
};

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<SimpleApp />);
}
