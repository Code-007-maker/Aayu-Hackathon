import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { runMigrations } from './store/migrations';

// Run storage migrations BEFORE React renders — fixes BUG 1 (old localStorage data)
runMigrations();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
