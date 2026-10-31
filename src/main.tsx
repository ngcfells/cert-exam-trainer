import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Compiled out of the single-file build, which must never register a service worker.
if (__PWA__) void import('./pwa').then((m) => m.registerPwa());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
