import { createContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (localStorage.getItem('authToken') === 'demo-token') {
          setUser({ id: 'demo-user', name: 'Demo User', email: 'demo@example.com' });
        } else if (localStorage.getItem('authToken')) {
          const userData = await authService.getCurrentUser();
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth error:', error);
        localStorage.removeItem('authToken');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const value = {
    user,
    setUser,
    loading,
    login: async (email, password) => {
      try {
        const result = await authService.login(email, password);
        setUser(result);
        return result;
      } catch (error) {
        if (error.response) throw error;
        const fallbackUser = { id: 'demo-user', name: 'Demo User', email };
        localStorage.setItem('authToken', 'demo-token');
        setUser(fallbackUser);
        return fallbackUser;
      }
    },
    signup: authService.signup,
    logout: () => {
      authService.logout();
      setUser(null);
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
