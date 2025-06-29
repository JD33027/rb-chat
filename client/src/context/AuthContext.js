import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This effect runs once on mount to check the stored token
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  const login = async (countryCode, phoneNumber, password) => {
    const response = await api.post('/login', { countryCode, phoneNumber, password });
    const newToken = response.data.token;
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const sendOtp = async (countryCode, phoneNumber) => {
    // This function will throw an error on failure, which the component can catch.
    const response = await api.post('/auth/send-otp', { countryCode, phoneNumber });
    return response.data; // Return the response data, which includes our devOtp
  };

  const signup = async (countryCode, phoneNumber, password, otp) => {
    const response = await api.post('/signup', { countryCode, phoneNumber, password, otp });
    const newToken = response.data.token;
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const updateProfile = async (profileData) => {
    await api.put('/profile', profileData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  const value = {
    token,
    isAuthenticated: !!token,
    login,
    sendOtp,
    signup,
    updateProfile,
    logout,
  };

  // Don't render children until we've checked for a token
  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
