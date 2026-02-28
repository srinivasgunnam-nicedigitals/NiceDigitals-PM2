import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../types';
import { backendApi } from '../services/api';
import { useRealtimeInvalidation } from '../hooks/useRealtimeInvalidation';

// ============================================================
// AuthContext: Single Responsibility — "Who is logged in?"
// This context must NOT know about Projects, Scores, or any
// other domain. It only manages authentication identity state.
// ============================================================

interface AuthContextType {
  currentUser: User | null;
  isAuthenticating: boolean;     // True during the login redirect window
  isRevalidating: boolean;       // True while /me is being called on mount
  setCurrentUser: (user: User | null) => void;
  setAuthenticating: (value: boolean) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'nice_digital_current_user_v4';

// --------------------------------------------------------
// RealtimeGate — rendered INSIDE AuthContext.Provider so that
// useAuth() resolves correctly. Must be at module scope so
// React sees a stable component identity across re-renders
// (avoids remount/socket-reconnect on every AuthProvider render).
// --------------------------------------------------------
const RealtimeGate = () => {
  useRealtimeInvalidation();
  return null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticating, setAuthenticating] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(true); // Starts true until /me resolves

  // Hydrate from localStorage as initial UI value (fast paint, not trusted)
  const [currentUser, setCurrentUserState] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setCurrentUser = useCallback((user: User | null) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // --------------------------------------------------------
  // Silent Token Revalidation on Mount
  // On every page load, we call GET /api/auth/me to confirm
  // the HttpOnly cookie is still valid. If the token has
  // expired or been revoked, we clear the stale localStorage
  // user and redirect to login.
  // --------------------------------------------------------
  const hasMounted = useRef(false);

  useEffect(() => {
    if (hasMounted.current) return;
    hasMounted.current = true;

    const revalidate = async () => {
      // If no user is stored, skip the /me call entirely
      if (!localStorage.getItem(STORAGE_KEY)) {
        setIsRevalidating(false);
        return;
      }

      try {
        const freshUser = await backendApi.getMe();
        setCurrentUser(freshUser);
      } catch {
        // Token is invalid or expired — clear stale data
        setCurrentUser(null);
        if (!window.location.pathname.includes('/ndpma/login')) {
          window.location.href = '/ndpma/login';
        }
      } finally {
        setIsRevalidating(false);
      }
    };

    revalidate();
  }, []);

  const logout = useCallback(async () => {
    try {
      await backendApi.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setCurrentUser(null);
      window.location.href = '/ndpma/login';
    }
  }, [setCurrentUser]);


  return (
    <AuthContext.Provider value={{
      currentUser,
      isAuthenticating,
      isRevalidating,
      setCurrentUser,
      setAuthenticating,
      logout
    }}>
      {/* RealtimeGate must be INSIDE the Provider so useAuth() resolves */}
      <RealtimeGate />
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
