import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import './index.css'

console.log('🔥 Testing with routing');

const TestPage = () => (
  <div style={{ padding: '20px', backgroundColor: 'purple', color: 'white', fontSize: '24px' }}>
    <h1>TEST PAGE WITH ROUTING</h1>
    <p>Current path: {window.location.pathname}</p>
  </div>
);

const SimpleApp = () => {
  console.log('🎯 SimpleApp with routing');
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<TestPage />} />
      </Routes>
    </BrowserRouter>
  );
};

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<SimpleApp />);
}
