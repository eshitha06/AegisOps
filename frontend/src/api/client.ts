import axios from 'axios';
import { Incident, Metric, RecoveryAction } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Incidents
  getIncidents: async (status?: string): Promise<Incident[]> => {
    const response = await client.get<Incident[]>('/incidents', {
      params: status ? { status } : {},
    });
    return response.data;
  },
  
  getIncident: async (id: number): Promise<Incident> => {
    const response = await client.get<Incident>(`/incidents/${id}`);
    return response.data;
  },

  createIncident: async (incident: Omit<Incident, 'id' | 'created_at' | 'resolved_at'>): Promise<Incident> => {
    const response = await client.post<Incident>('/incidents', incident);
    return response.data;
  },

  // Metrics
  ingestMetric: async (metric: Omit<Metric, 'id' | 'is_anomaly' | 'recorded_at'>): Promise<Metric> => {
    const response = await client.post<Metric>('/metrics/ingest', metric);
    return response.data;
  },

  getMetrics: async (service: string): Promise<Metric[]> => {
    const response = await client.get<Metric[]>(`/metrics/${service}`);
    return response.data;
  },

  getHealthScore: async (): Promise<{ health_score: number }> => {
    const response = await client.get<{ health_score: number }>('/health-score');
    return response.data;
  },

  // Agents
  runRCA: async (incidentId: number) => {
    const response = await client.post('/agents/run-rca', { incident_id: incidentId });
    return response.data;
  },

  runRecovery: async (incidentId: number) => {
    const response = await client.post('/agents/run-recovery', { incident_id: incidentId });
    return response.data;
  },

  // Predictions
  getPredictions: async (service: string) => {
    const response = await client.get(`/predictions/${service}`);
    return response.data;
  },

  // Recovery Actions
  getRecoveryActions: async (incidentId?: number): Promise<RecoveryAction[]> => {
    const response = await client.get<RecoveryAction[]>('/recovery', {
      params: incidentId ? { incident_id: incidentId } : {}
    });
    return response.data;
  },

  approveRecoveryAction: async (id: number): Promise<RecoveryAction> => {
    const response = await client.post<RecoveryAction>(`/recovery/${id}/approve`);
    return response.data;
  },

  executeRecoveryAction: async (id: number): Promise<{ status: string; log: string[] }> => {
    const response = await client.post<{ status: string; log: string[] }>(`/recovery/${id}/execute`);
    return response.data;
  },
};

export default client;
