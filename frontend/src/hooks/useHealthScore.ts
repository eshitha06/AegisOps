import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function useHealthScore(pollIntervalMs: number = 10000) {
  const [healthScore, setHealthScore] = useState<number>(98);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchScore = async () => {
    try {
      const data = await api.getHealthScore();
      setHealthScore(data.health_score);
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScore();
    const interval = setInterval(fetchScore, pollIntervalMs);
    return () => clearInterval(interval);
  }, [pollIntervalMs]);

  return { healthScore, loading, error, refresh: fetchScore };
}
