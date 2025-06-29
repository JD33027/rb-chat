import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../services/api';

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) {
      return;
    }
    // Establish connection when user is authenticated
    const newSocket = io(API_BASE_URL);

    newSocket.on('connect', () => {
      // Authenticate the socket connection
      newSocket.emit('authenticate', token);
    });

    setSocket(newSocket);

    // Cleanup on component unmount or token change
    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [token]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};