'use client';

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';

interface WebSocketMessage {
  type: string;
  payload: any;
}

interface WebSocketContextType {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  subscribe: (type: string, callback: (payload: any) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const subscribersRef = useRef<{ [key: string]: Set<(payload: any) => void> }>({});

  const connect = () => {
    let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8022/api';
    
    // Fallback logic for accessing from network IP
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && apiUrl.includes('localhost')) {
      apiUrl = apiUrl.replace('localhost', window.location.hostname);
    }

    // Clean up apiUrl to ensure no double slashes and correct protocol
    const cleanApiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    const wsUrl = cleanApiUrl.replace(/^http/, 'ws') + '/ws';

    console.log('Connecting to WebSocket:', wsUrl, 'Current Host:', typeof window !== 'undefined' ? window.location.host : 'SSR');
    
    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        const rawData = event.data;
        if (typeof rawData !== 'string') return;

        // Split messages by newline (Go backend appends them with \n)
        const rawMessages = rawData.split('\n').filter(msg => msg.trim() !== '');

        rawMessages.forEach(msgStr => {
          try {
            const message: WebSocketMessage = JSON.parse(msgStr);
            setLastMessage(message);

            if (subscribersRef.current[message.type]) {
              subscribersRef.current[message.type].forEach((callback) => callback(message.payload));
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message chunk:', error, 'Raw:', msgStr);
          }
        });
      };

      ws.onclose = (e) => {
        console.log('WebSocket disconnected', e.code, e.reason);
        setIsConnected(false);
        // Attempt to reconnect after 3 seconds
        if (socketRef.current === ws) {
          setTimeout(connect, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      socketRef.current = ws;
    } catch (e) {
      console.error('WebSocket connection setup failed:', e);
      setTimeout(connect, 3000);
    }
  };

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const subscribe = (type: string, callback: (payload: any) => void) => {
    if (!subscribersRef.current[type]) {
      subscribersRef.current[type] = new Set();
    }
    subscribersRef.current[type].add(callback);

    return () => {
      subscribersRef.current[type].delete(callback);
      if (subscribersRef.current[type].size === 0) {
        delete subscribersRef.current[type];
      }
    };
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, lastMessage, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
};
