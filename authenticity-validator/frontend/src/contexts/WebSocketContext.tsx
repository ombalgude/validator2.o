'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { WebSocketMessage } from '@/types';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: (type: string, data: any) => void;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Message event handlers
    newSocket.on('verification_update', (data) => {
      console.log('Verification update received:', data);
      setLastMessage({
        type: 'verification_update',
        data,
        timestamp: new Date().toISOString(),
      });
    });

    newSocket.on('notification', (data) => {
      console.log('Notification received:', data);
      setLastMessage({
        type: 'notification',
        data,
        timestamp: new Date().toISOString(),
      });
    });

    newSocket.on('dashboard_update', (data) => {
      console.log('Dashboard update received:', data);
      setLastMessage({
        type: 'dashboard_update',
        data,
        timestamp: new Date().toISOString(),
      });
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  const sendMessage = (type: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(type, data);
    } else {
      console.warn('WebSocket not connected. Cannot send message.');
    }
  };

  const joinRoom = (room: string) => {
    if (socket && isConnected) {
      socket.emit('join_room', room);
    } else {
      console.warn('WebSocket not connected. Cannot join room.');
    }
  };

  const leaveRoom = (room: string) => {
    if (socket && isConnected) {
      socket.emit('leave_room', room);
    } else {
      console.warn('WebSocket not connected. Cannot leave room.');
    }
  };

  const value: WebSocketContextType = {
    socket,
    isConnected,
    lastMessage,
    sendMessage,
    joinRoom,
    leaveRoom,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};