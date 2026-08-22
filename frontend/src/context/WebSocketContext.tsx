import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Metric } from '../types';
import { api } from '../api/client';

export type ConnectionStatus = 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED' | 'STALE';

interface WebSocketContextType {
  metrics: Metric[];
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  lastMessageTime: number | null;
}

const WebSocketContext = createContext<WebSocketContextType>({
  metrics: [],
  isConnected: false,
  connectionStatus: 'RECONNECTING',
  lastMessageTime: null,
});

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('RECONNECTING');
  const [lastMessageTime, setLastMessageTime] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const lastMsgTimeRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  // Bootstrap initial metrics via REST so UI never flashes empty state
  useEffect(() => {
    let active = true;
    const fetchInitial = async () => {
      try {
        const [apiMetrics, workerMetrics] = await Promise.all([
          api.getMetrics('api').catch(() => []),
          api.getMetrics('worker').catch(() => []),
        ]);
        if (active && (apiMetrics.length > 0 || workerMetrics.length > 0)) {
          const combined: Metric[] = [];
          if (apiMetrics.length > 0) combined.push(apiMetrics[apiMetrics.length - 1]);
          if (workerMetrics.length > 0) combined.push(workerMetrics[workerMetrics.length - 1]);
          setMetrics((prev) => (prev.length === 0 ? combined : prev));
        }
      } catch {}
    };
    fetchInitial();
    return () => {
      active = false;
    };
  }, []);

  const getWsUrl = useCallback(() => {
    const configured = import.meta.env.VITE_API_URL;
    if (configured && configured.startsWith('http')) {
      const url = new URL(configured);
      const proto = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${url.host}/ws/metrics`;
    }
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws/metrics`;
  }, []);

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;

    if (wsRef.current) {
      try {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    const wsUrl = getWsUrl();
    setConnectionStatus('RECONNECTING');

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        reconnectAttemptsRef.current = 0;
        setConnectionStatus('CONNECTED');
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          if (Array.isArray(data) && data.length > 0) {
            setMetrics(data);
            const now = Date.now();
            lastMsgTimeRef.current = now;
            setLastMessageTime(now);
            setConnectionStatus('CONNECTED');
          }
        } catch (err) {
          console.error('[WebSocket] Parse error:', err);
        }
      };

      ws.onerror = () => {
        if (!isMountedRef.current) return;
        setConnectionStatus('DISCONNECTED');
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;
        setConnectionStatus('DISCONNECTED');
        reconnectAttemptsRef.current += 1;
        const backoff = Math.min(2000 * Math.pow(1.5, reconnectAttemptsRef.current - 1), 10000);
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(connect, backoff);
      };
    } catch (err) {
      console.error('[WebSocket] Init failed:', err);
      setConnectionStatus('DISCONNECTED');
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, [getWsUrl]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    const staleInterval = setInterval(() => {
      if (lastMsgTimeRef.current > 0 && Date.now() - lastMsgTimeRef.current > 10000) {
        setConnectionStatus((prev) => (prev === 'CONNECTED' ? 'STALE' : prev));
      }
    }, 2500);

    return () => {
      isMountedRef.current = false;
      clearInterval(staleInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  return (
    <WebSocketContext.Provider
      value={{
        metrics,
        isConnected: connectionStatus === 'CONNECTED',
        connectionStatus,
        lastMessageTime,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  return useContext(WebSocketContext);
}
