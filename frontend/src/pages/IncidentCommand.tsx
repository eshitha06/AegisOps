import { useState } from 'react';
import { 
  AlertOctagon, 
  Play, 
  Terminal, 
  Server, 
  Clock, 
  Compass, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import StatusBadge from '../components/ui/StatusBadge';
import ConfidenceBar from '../components/ui/ConfidenceBar';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface Incident {
  id: number;
  title: string;
  service: string;
  status: 'open' | 'investigating' | 'resolved';
  severity: 'critical' | 'high' | 'medium' | 'low';
  created_at: string;
  resolved_at: string | null;
  root_cause: string | null;
  confidence_score: number | null;
  timeline: string[];
  recommendations: string[];
}

const mockIncidents: Incident[] = [
  {
    id: 1,
    title: 'Connection pool exhaustion detected - payment-service',
    service: 'payment-service',
    status: 'open',
    severity: 'critical',
    created_at: '2026-06-06T12:45:00Z',
    resolved_at: null,
    root_cause: 'Database connection pool exhausted due to configuration change in deployment v2.3',
    confidence_score: 0.94,
    timeline: [
      '12:44:00 - Configuration deployment v2.3 applied with max_connections=10',
      '12:44:15 - Traffic spike on /pay endpoint initiates 15 simultaneous database connections',
      '12:44:30 - payment-service connection pool depleted, requests begin queuing',
      '12:45:00 - API failure and connection timeouts detected, anomaly flagged'
    ],
    recommendations: [
      'Rollback deployment v2.3 to restore previous configuration',
      'Increase database connection pool max limit to 50',
      'Restart payment-service container to release hung connections'
    ]
  },
  {
    id: 2,
    title: 'High latency on auth-service login endpoint',
    service: 'auth-service',
    status: 'investigating',
    severity: 'high',
    created_at: '2026-06-06T12:30:00Z',
    resolved_at: null,
    root_cause: 'Authentication Redis cache miss leading to redundant Bcrypt hashing operations',
    confidence_score: 0.81,
    timeline: [
      '12:28:10 - Redis cluster node replica-2 goes offline',
      '12:28:30 - auth-service requests fall back to direct DB lookups and CPU intensive hashing',
      '12:30:00 - Latency spikes to 4200ms on login endpoint'
    ],
    recommendations: [
      'Check Redis node status and restart cluster replica-2',
      'Temporarily scale auth-service to absorb higher CPU workload'
    ]
  },
  {
    id: 3,
    title: 'Disk space warning on db-replica-01',
    service: 'database',
    status: 'resolved',
    severity: 'medium',
    created_at: '2026-06-06T10:15:00Z',
    resolved_at: '2026-06-06T12:00:00Z',
    root_cause: 'Log rotation daemon failure leading to excessive storage consumption by system.log',
    confidence_score: 0.99,
    timeline: [
      '04:00:00 - logrotate fails to run due to syntax error in configuration',
      '10:15:00 - disk usage reaches 91%, warning threshold exceeded',
      '11:45:00 - SRE operator triggers manual log truncation',
      '12:00:00 - Disk usage returned to 42%, incident resolved'
    ],
    recommendations: [
      'Fix syntax error in /etc/logrotate.d/nginx configuration',
      'Run manual rotation validation'
    ]
  }
];

export default function IncidentCommand() {
  const incidents = mockIncidents;
  const [selectedId, setSelectedId] = useState<number>(1);
  const [rcaStatus, setRcaStatus] = useState<Record<number, 'idle' | 'running' | 'completed'>>({
    1: 'idle',
    2: 'idle',
    3: 'completed', // Seeded resolved incident is already completed
  });

  const selectedIncident = incidents.find(inc => inc.id === selectedId) || incidents[0];

  const handleRunRCA = (id: number) => {
    setRcaStatus(prev => ({ ...prev, [id]: 'running' }));
    
    // Simulate Gemini analysis
    setTimeout(() => {
      setRcaStatus(prev => ({ ...prev, [id]: 'completed' }));
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Incident Command Center
        </h2>
        <p className="text-slate-400 mt-1">
          Review active system alerts, trigger AI-driven Root Cause Analysis (RCA), and review causal timelines.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Incidents List */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Active Alerts ({incidents.filter(i => i.status !== 'resolved').length})
          </h3>
          <div className="space-y-3">
            {incidents.map((incident) => {
              const isSelected = incident.id === selectedId;
              const rcaState = rcaStatus[incident.id] || 'idle';
              
              return (
                <div
                  key={incident.id}
                  onClick={() => setSelectedId(incident.id)}
                  className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? 'bg-brand-primary/10 border-brand-primary/40 shadow-lg glow-primary'
                      : 'bg-brand-dark/50 border-brand-border/30 hover:border-brand-border/60 hover:bg-brand-card/30'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <StatusBadge value={incident.severity} />
                    <StatusBadge value={incident.status} />
                  </div>
                  <h4 className="text-sm font-bold text-white mt-3 leading-snug line-clamp-2">
                    {incident.title}
                  </h4>
                  <div className="flex justify-between items-center mt-4 text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                      <Server className="w-3.5 h-3.5 text-brand-primary" />
                      <span className="font-mono">{incident.service}</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(incident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  {rcaState === 'completed' && (
                    <div className="mt-3 pt-3 border-t border-brand-border/20 flex items-center gap-1.5 text-xs text-brand-success font-medium">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>RCA Analyzed</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Incident Details & RCA Panel */}
        <div className="lg:col-span-8">
          <div className="glass-card p-6 min-h-[500px] flex flex-col">
            {/* Header info */}
            <div className="border-b border-brand-border/30 pb-6 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-6 h-6 text-brand-danger animate-pulse" />
                  <h3 className="text-lg font-bold text-white leading-tight">
                    INCIDENT-{selectedIncident.id}: {selectedIncident.service}
                  </h3>
                </div>
                <div className="flex gap-2">
                  <StatusBadge value={selectedIncident.severity} />
                  <StatusBadge value={selectedIncident.status} />
                </div>
              </div>
              <p className="text-sm text-slate-300 mt-3 font-semibold bg-brand-darkest/40 p-3 rounded-lg border border-brand-border/20">
                {selectedIncident.title}
              </p>
            </div>

            {/* RCA Trigger Panel / RCA Content */}
            <div className="flex-1 flex flex-col">
              {rcaStatus[selectedIncident.id] === 'idle' && (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                  <Compass className="w-16 h-16 text-slate-600 mb-4 animate-pulse" />
                  <h4 className="text-base font-bold text-white">Root Cause Analysis Available</h4>
                  <p className="text-sm text-slate-400 max-w-sm mt-2">
                    AegisOps can aggregate log anomalies, database locks, and performance spikes to analyze the root cause of this failure.
                  </p>
                  <button
                    onClick={() => handleRunRCA(selectedIncident.id)}
                    className="mt-6 flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-primary text-brand-darkest font-extrabold hover:opacity-90 transition-all duration-200 glow-primary"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Run AI RCA Pipeline
                  </button>
                </div>
              )}

              {rcaStatus[selectedIncident.id] === 'running' && (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                  <LoadingSpinner size="lg" className="mb-4" />
                  <h4 className="text-base font-bold text-white">Querying Vector Knowledge Base...</h4>
                  <p className="text-sm text-slate-400 max-w-xs mt-2 animate-pulse">
                    Retrieving historic runbooks, scanning metrics, and calling Gemini 1.5 Flash...
                  </p>
                </div>
              )}

              {rcaStatus[selectedIncident.id] === 'completed' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Root Cause Box */}
                  <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-5">
                    <div className="flex items-center gap-2 text-brand-primary font-bold text-sm mb-2">
                      <Terminal className="w-4 h-4" />
                      <span>AI Root Cause Identification</span>
                    </div>
                    <p className="text-white font-medium leading-relaxed">
                      {selectedIncident.root_cause}
                    </p>
                    <div className="mt-4 pt-4 border-t border-brand-border/20 max-w-md">
                      <ConfidenceBar score={selectedIncident.confidence_score || 0} />
                    </div>
                  </div>

                  {/* Causal Chain Timeline */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Causal Chain Timeline
                    </h4>
                    <div className="relative border-l-2 border-brand-border/40 ml-3 pl-6 space-y-5">
                      {selectedIncident.timeline.map((step, index) => (
                        <div key={index} className="relative">
                          {/* Dot marker */}
                          <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-brand-primary border-2 border-brand-darkest shadow-md glow-primary" />
                          <p className="text-xs font-semibold text-slate-400 font-mono">{step.split(' - ')[0]}</p>
                          <p className="text-sm font-medium text-slate-200 mt-1">{step.split(' - ')[1]}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Recommendations */}
                  <div className="pt-4 border-t border-brand-border/20">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                      Next Action Recommendations
                    </h4>
                    <ul className="space-y-2">
                      {selectedIncident.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2.5 text-sm text-slate-300">
                          <span className="flex-shrink-0 w-5 h-5 rounded bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-bold flex items-center justify-center font-mono mt-0.5">
                            {index + 1}
                          </span>
                          <span className="leading-snug">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
