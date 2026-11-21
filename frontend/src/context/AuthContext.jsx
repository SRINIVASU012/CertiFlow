import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export const DEMO_ACCOUNTS = [
  { name: 'Anika Sharma', email: 'anika@pragati.org', role: 'TRAINING_CENTRE', label: 'Training Centre (Anika)' },
  { name: 'Dev Patel', email: 'dev@pragati.org', role: 'DISTRICT_OFFICER', label: 'District Officer 1 (Dev)' },
  { name: 'Meera Nair', email: 'meera@pragati.org', role: 'DISTRICT_OFFICER', label: 'District Officer 2 (Meera)' },
  { name: 'Kabir Rao', email: 'kabir@pragati.org', role: 'DISTRICT_OFFICER', label: 'District Officer 3 (Kabir)' },
  { name: 'Neha Verma', email: 'neha@pragati.org', role: 'QUALITY_TEAM', label: 'Quality Review (Neha)' },
  { name: 'Farah Khan', email: 'farah@pragati.org', role: 'STATE_OFFICE', label: 'State Office (Farah)' }
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('certiflow_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('certiflow_token');
      if (storedToken) {
        try {
          const res = await apiClient.get('/auth/me');
          setUser(res.data.data.user);
        } catch (err) {
          console.error('Failed to restore session:', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    const { token: receivedToken, user: receivedUser } = res.data.data;

    localStorage.setItem('certiflow_token', receivedToken);
    localStorage.setItem('certiflow_user', JSON.stringify(receivedUser));
    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  };

  const quickLogin = async (email) => {
    return login(email, 'Password@123');
  };

  const logout = () => {
    localStorage.removeItem('certiflow_token');
    localStorage.removeItem('certiflow_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        quickLogin,
        logout,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
