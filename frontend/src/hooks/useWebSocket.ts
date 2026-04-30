import { useEffect } from 'react';
import { useWebSocketContext } from '../context/WebSocketContext';

export const useWebSocket = (type: string, callback: (payload: any) => void) => {
  const { subscribe } = useWebSocketContext();

  useEffect(() => {
    const unsubscribe = subscribe(type, callback);
    return () => unsubscribe();
  }, [type, callback, subscribe]);
};
