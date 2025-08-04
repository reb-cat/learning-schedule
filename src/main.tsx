import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('🔥 Testing with real App component');

createRoot(document.getElementById("root")!).render(<App />);
