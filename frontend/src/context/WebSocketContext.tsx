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
    let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://mario-api.ntoric.com/api';

    // Fallback logic for accessing from network IP or mobile
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      if (apiUrl.includes('localhost')) {
        apiUrl = apiUrl.replace('localhost', window.location.hostname);
      } else if (apiUrl.includes('127.0.0.1')) {
        apiUrl = apiUrl.replace('127.0.0.1', window.location.hostname);
      }
    }

    // Clean up apiUrl to ensure no double slashes and correct protocol
    const cleanApiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;

    // Automatically use wss:// if the page is loaded over https://
    let wsUrl = cleanApiUrl.replace(/^http/, 'ws');
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      wsUrl = wsUrl.replace(/^ws:/, 'wss:');
    }

    // The Go backend is served under /api/ws
    if (!wsUrl.endsWith('/ws')) {
      wsUrl = wsUrl + '/ws';
    }

    console.log('[WS] Connecting to:', wsUrl);
    console.log('[WS] API Source:', apiUrl);
    console.log('[WS] Hostname:', typeof window !== 'undefined' ? window.location.hostname : 'n/a');
    console.log('[WS] Request headers will be handled by browser/proxy');

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WS] Connected successfully');
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
            console.error('[WS] Failed to parse message:', error, 'Raw:', msgStr);
          }
        });
      };

      ws.onclose = (e) => {
        console.log('[WS] Disconnected', { code: e.code, reason: e.reason, wasClean: e.wasClean });
        setIsConnected(false);
        // Attempt to reconnect after 3 seconds
        if (socketRef.current === ws) {
          console.log('[WS] Reconnecting in 3s...');
          setTimeout(connect, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('[WS] Connection error for URL:', wsUrl, '. ReadyState:', ws.readyState);
        console.error('[WS] Error event details:', error);
      };

      socketRef.current = ws;
    } catch (e) {
      console.error('[WS] Connection setup failed:', e);
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
