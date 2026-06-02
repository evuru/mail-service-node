import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Apply saved theme before first paint to prevent flash
const saved = (() => {
  try { return JSON.parse(localStorage.getItem('ui-store') || '{}').state?.theme ?? 'system'; }
  catch { return 'system'; }
})();
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const isDark = saved === 'dark' || (saved === 'system' && prefersDark);
document.documentElement.classList.toggle('dark', isDark);

// Keep system theme in sync when user changes OS preference
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  try {
    const theme = JSON.parse(localStorage.getItem('ui-store') || '{}').state?.theme ?? 'system';
    if (theme === 'system') document.documentElement.classList.toggle('dark', e.matches);
  } catch { /* ignore */ }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
