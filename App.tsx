import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './Routes';
import { ThemeProvider } from './ThemeContext';
import { AppProvider, useApp } from './store';
import { ModalProvider } from './hooks/useModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import RoleSpecificDashboard from './pages/Dashboard';
import { Login } from './pages/Login';

const AppContent = () => {
  return (
    <BrowserRouter basename="/ndpma">
      <AppRoutes />
    </BrowserRouter>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ModalProvider>
          <AppProvider>
            <AppContent />
          </AppProvider>
        </ModalProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
