import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import client from '../api/client';

export type TelemetryMode = 'real' | 'demo';

interface TelemetryModeContextType {
  mode: TelemetryMode;
  setMode: (mode: TelemetryMode) => void;
}

const TelemetryModeContext = createContext<TelemetryModeContextType | undefined>(undefined);

export function TelemetryModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<TelemetryMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('telemetryMode') as TelemetryMode | null;
      if (stored) return stored;
    }
    return 'real';
  });

  useEffect(() => {
    localStorage.setItem('telemetryMode', mode);
    client.post('/telemetry/mode', { mode }).catch(() => undefined);
  }, [mode]);

  return (
    <TelemetryModeContext.Provider value={{ mode, setMode }}>
      {children}
    </TelemetryModeContext.Provider>
  );
}

export function useTelemetryMode() {
  const context = useContext(TelemetryModeContext);
  if (!context) {
    return {
      mode: 'real' as const,
      setMode: () => {},
    };
  }
  return context;
}
