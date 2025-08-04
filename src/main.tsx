import { createRoot } from 'react-dom/client'
import './index.css'

console.log('🔥 Main.tsx is executing');

const root = document.getElementById("root");
console.log('📍 Root element:', root);

if (root) {
  console.log('✅ Root found, creating simple test');
  createRoot(root).render(
    <div style={{ padding: '20px', backgroundColor: 'blue', color: 'white', fontSize: '24px' }}>
      <h1>SIMPLE TEST - WORKING</h1>
      <p>If you can see this, React is working</p>
    </div>
  );
} else {
  console.error('❌ Root element not found');
}
