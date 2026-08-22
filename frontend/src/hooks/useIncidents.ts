import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Incident } from '../types';

export default function useIncidents(status?: string, pollIntervalMs: number = 5000) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchIncidents = async () => {
    try {
      const data = await api.getIncidents(status);
      setIncidents(data);
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, pollIntervalMs);
    return () => clearInterval(interval);
  }, [status, pollIntervalMs]);

  return { incidents, loading, error, refresh: fetchIncidents };
}
