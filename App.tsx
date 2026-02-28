import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './Routes';
import { ThemeProvider } from './ThemeContext';
import { ModalProvider } from './hooks/useModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';

// Provider Hierarchy (outermost = rendered first):
// QueryClientProvider (index.tsx)
//   └─ AuthProvider       (identity + silent revalidation)
//       └─ ThemeProvider  (UI preference)
//           └─ ModalProvider (imperative overlay)
//               └─ App

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
      <AuthProvider>
        <ThemeProvider>
          <ModalProvider>
            <AppContent />
          </ModalProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
