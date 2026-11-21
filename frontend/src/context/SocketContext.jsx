import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('⚡ Socket connected to CertiFlow live feed');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('⚠️ Socket disconnected');
      setConnected(false);
    });

    // Listen for universal notifications
    newSocket.on('batch_approved', (data) => {
      addNotification(`Batch updated: Approvals count now ${data.approvalsCount}.`);
    });

    newSocket.on('batch_rejected', (data) => {
      addNotification(`Batch rejected: "${data.reason}".`);
    });

    newSocket.on('batch_returned', (data) => {
      addNotification(`Batch returned for corrections: "${data.reason}".`);
    });

    newSocket.on('certificate_cancelled', (data) => {
      addNotification(`⚠️ Certificate ${data.certificateNumber} was cancelled: ${data.reason}`);
    });

    newSocket.on('delayed_batch_alert', (data) => {
      addNotification(`🚨 Escalation Alert: Batch ${data.batchNumber} has been delayed for ${data.hoursDelayed} hours.`);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  const addNotification = (text) => {
    setNotifications((prev) => [
      { id: Date.now(), text, timestamp: new Date().toLocaleTimeString() },
      ...prev.slice(0, 9) // Keep last 10
    ]);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <SocketContext.Provider value={{ socket, connected, notifications, clearNotifications }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
export default SocketContext;
