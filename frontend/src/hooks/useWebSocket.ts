import { useState, useEffect, useRef } from 'react';
import { Metric } from '../types';

export default function useWebSocket() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const configuredBase = import.meta.env.VITE_API_URL;
    const wsUrl = configuredBase
      ? configuredBase.replace(/^http/, 'ws') + '/ws/metrics'
      : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/metrics`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('WS Connection established:', wsUrl);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (Array.isArray(data)) {
          setMetrics(data);
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    ws.onerror = (event) => {
      console.error('WS Error:', event);
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('WS Connection closed');
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { metrics, isConnected };
}
