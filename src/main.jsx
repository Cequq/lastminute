import { testSupabase } from './lib/testSupabase';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import App from './App';
import './index.css';
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <App />
        <Toaster position="top-center"
                 toastOptions={{ style: { borderRadius: 14, background: '#0B1A24', color: '#fff', fontWeight: 600, fontSize: 14, border: '1px solid rgb(255 255 255 / 0.08)' } }} />
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
testSupabase();
