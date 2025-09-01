import { createRoot } from 'react-dom/client';
import React from 'react';
import App from './App';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Missing #root');

createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
