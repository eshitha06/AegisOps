import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Cpu, 
  HardDrive, 
  AlertTriangle, 
  Server,
  ArrowRight,
  Shield,
  Clock
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import StatusBadge from '../components/ui/StatusBadge';
import useHealthScore from '../hooks/useHealthScore';
import useIncidents from '../hooks/useIncidents';
import useWebSocket from '../hooks/useWebSocket';

export default function Dashboard() {
  const { healthScore, loading: healthLoading } = useHealthScore();
  const { incidents, loading: incidentsLoading } = useIncidents(undefined, 3000);
  const { metrics: wsMetrics, connectionStatus } = useWebSocket();

  // Accumulate metrics timeline history
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (wsMetrics.length > 0) {
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      // Calculate averages across all services in the batch
      const avgCpu = wsMetrics.reduce((sum, m) => sum + m.cpu_usage, 0) / wsMetrics.length * 100;
      const avgMem = wsMetrics.reduce((sum, m) => sum + m.memory_usage, 0) / wsMetrics.length * 100;
      const avgError = wsMetrics.reduce((sum, m) => sum + m.error_rate, 0) / wsMetrics.length;
      
      setHistory(prev => {
        const newHistory = [...prev, { name: timestamp, cpu: avgCpu, memory: avgMem, errors: avgError }];
        // Keep last 15 points
        if (newHistory.length > 15) {
          return newHistory.slice(1);
        }
        return newHistory;
      });
    }
  }, [wsMetrics]);

  // Current values
  const currentCpu = wsMetrics.length > 0 
    ? (wsMetrics.reduce((sum, m) => sum + m.cpu_usage, 0) / wsMetrics.length * 100) 
    : null;
  const currentMem = wsMetrics.length > 0 
    ? (wsMetrics.reduce((sum, m) => sum + m.memory_usage, 0) / wsMetrics.length * 100) 
    : null;
  const activeIncidents = incidents.filter(i => i.status !== 'resolved');

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Executive Dashboard
          </h2>
          <p className="text-slate-400 mt-1">
            Live telemetry and incident posture across monitored services.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-brand-dark/50 border border-brand-border/40 backdrop-blur-lg px-4 py-2 rounded-xl text-xs text-slate-300 font-mono">
          <Clock className="w-4 h-4 text-brand-primary animate-pulse" />
          <span>
            Telemetry Link:{' '}
            <strong className={
              connectionStatus === 'CONNECTED' ? 'text-brand-success' :
              connectionStatus === 'RECONNECTING' ? 'text-amber-400' :
              connectionStatus === 'STALE' ? 'text-amber-300' : 'text-brand-danger'
            }>
              {connectionStatus}
            </strong>
          </span>
        </div>
      </div>

      {/* Grid: Health Score & Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Health Score Circle */}
        <div className="lg:col-span-1 glass-card p-6 flex flex-col items-center justify-center text-center">
          <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">
            System Health Index
          </h3>
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* Background Circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r="64"
                className="stroke-brand-darkest fill-none"
                strokeWidth="10"
              />
              <circle
                cx="72"
                cy="72"
                r="64"
                className="stroke-brand-success fill-none transition-all duration-1000 ease-out"
                strokeWidth="10"
                strokeDasharray={2 * Math.PI * 64}
                strokeDashoffset={2 * Math.PI * 64 * (1 - (healthLoading ? 98 : healthScore) / 100)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold text-white tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {healthLoading ? '--' : healthScore}
              </span>
              <span className={`text-[10px] font-semibold uppercase tracking-widest mt-0.5 ${healthScore >= 90 ? 'text-brand-success' : healthScore >= 70 ? 'text-brand-warning' : 'text-brand-danger'}`}>
                {healthScore >= 90 ? 'Optimal' : healthScore >= 70 ? 'Warning' : 'Critical'}
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
            <Shield className={`w-3.5 h-3.5 ${healthScore >= 90 ? 'text-brand-success' : 'text-brand-warning'}`} />
            <span>{healthScore >= 90 ? 'Secure & Stable' : 'Action Required'}</span>
          </div>
        </div>

        {/* Highlight Stats Cards */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Card 1: CPU */}
          <div className="glass-card p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg CPU Usage</p>
                <h3 className="text-3xl font-bold text-white mt-2 font-mono">{currentCpu === null ? 'NO DATA' : `${currentCpu.toFixed(1)}%`}</h3>
              </div>
              <div className="p-2.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">
                <Cpu className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-brand-border/20 flex items-center justify-between text-xs">
              <span className="text-slate-500">Threshold: 90%</span>
              <span className={`font-medium ${currentCpu === null ? 'text-slate-500' : currentCpu > 90 ? 'text-brand-danger' : 'text-brand-success'}`}>{currentCpu === null ? 'Waiting' : currentCpu > 90 ? 'Degraded' : 'Healthy'}</span>
            </div>
          </div>

          {/* Card 2: Memory */}
          <div className={`glass-card p-6 flex flex-col justify-between ${activeIncidents.length > 0 ? 'system-critical' : ''}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Memory</p>
                <h3 className="text-3xl font-bold text-white mt-2 font-mono">{currentMem === null ? 'NO DATA' : `${currentMem.toFixed(1)}%`}</h3>
              </div>
              <div className="p-2.5 rounded-xl bg-brand-accent/10 border border-brand-accent/20 text-brand-accent">
                <HardDrive className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-brand-border/20 flex items-center justify-between text-xs">
              <span className="text-slate-500">Threshold: 90%</span>
              <span className={`font-medium ${currentMem === null ? 'text-slate-500' : currentMem > 90 ? 'text-brand-danger' : 'text-brand-success'}`}>{currentMem === null ? 'Waiting' : currentMem > 90 ? 'Degraded' : 'Healthy'}</span>
            </div>
          </div>

          {/* Card 3: Active Incidents */}
          <div className="glass-card p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Incidents</p>
                <h3 className={`text-3xl font-bold mt-2 font-mono ${activeIncidents.length > 0 ? 'text-brand-danger' : 'text-brand-success'}`}>{incidentsLoading ? '--' : activeIncidents.length}</h3>
              </div>
              <div className={`p-2.5 rounded-lg border ${activeIncidents.length > 0 ? 'bg-brand-danger/10 border-brand-danger/20 text-brand-danger' : 'bg-brand-success/10 border-brand-success/20 text-brand-success'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-brand-border/20 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                {activeIncidents.filter(i => i.severity === 'critical').length} Critical, {activeIncidents.filter(i => i.severity === 'high').length} High
              </span>
              <span className={`font-medium ${activeIncidents.length > 0 ? 'text-brand-danger animate-pulse' : 'text-brand-success'}`}>
                {activeIncidents.length > 0 ? 'Investigating' : 'All Clear'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Three-panel Metric Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel 1: CPU Saturation Trend */}
        <div className="glass-card p-6 min-h-[280px] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-primary" />
              CPU Saturation Timeline
            </h3>
            <p className="text-xs text-slate-400 mt-1">Average cluster CPU utilization %</p>
          </div>
          <div className="h-44 mt-4">
            {history.length > 0 ? <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#242e47" opacity={0.3} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={9} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#0e1322', borderColor: '#242e47', borderRadius: '8px', color: '#f8fafc', fontSize: 11 }} />
                <Line type="monotone" dataKey="cpu" stroke="#e33b45" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer> : <div className="flex h-full items-center justify-center font-mono text-xs text-slate-500">WAITING FOR TELEMETRY</div>}
          </div>
        </div>

        {/* Panel 2: Memory Allocation Trend */}
        <div className="glass-card p-6 min-h-[280px] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-accent" />
              Memory Allocation Timeline
            </h3>
            <p className="text-xs text-slate-400 mt-1">Average cluster Memory utilization %</p>
          </div>
          <div className="h-44 mt-4">
            {history.length > 0 ? <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#242e47" opacity={0.3} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={9} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#0e1322', borderColor: '#242e47', borderRadius: '8px', color: '#f8fafc', fontSize: 11 }} />
                <Line type="monotone" dataKey="memory" stroke="#d1d1d6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer> : <div className="flex h-full items-center justify-center font-mono text-xs text-slate-500">WAITING FOR TELEMETRY</div>}
          </div>
        </div>

        {/* Panel 3: Error Rate Frequency */}
        <div className="glass-card p-6 min-h-[280px] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-danger" />
              Telemetry Error Rate
            </h3>
            <p className="text-xs text-slate-400 mt-1">Average failures/sec telemetry trend</p>
          </div>
          <div className="h-44 mt-4">
            {history.length > 0 ? <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#242e47" opacity={0.3} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0e1322', borderColor: '#242e47', borderRadius: '8px', color: '#f8fafc', fontSize: 11 }} />
                <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer> : <div className="flex h-full items-center justify-center font-mono text-xs text-slate-500">WAITING FOR TELEMETRY</div>}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Live Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 glass-card p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-semibold text-white">Active Operational Incidents</h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time listing of active and unresolved system failures</p>
            </div>
            <Server className="w-4 h-4 text-slate-500" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeIncidents.slice(0, 6).map((incident) => {
              const isLiveActive = incident.live_condition === 'ACTIVE';
              return (
                <div 
                  key={incident.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all duration-200 ${
                    isLiveActive 
                      ? 'border-red-500/40 bg-red-950/20 incident-critical' 
                      : 'border-brand-border/30 bg-brand-darkest/40 hover:border-brand-primary/20'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">INCIDENT-{incident.id}</span>
                      <div className="flex items-center gap-1.5">
                        {isLiveActive ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-extrabold bg-red-950 text-red-400 border border-red-500/50">
                            LIVE ACTIVE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-950/50 text-emerald-400 border border-emerald-800/40">
                            CLEARED
                          </span>
                        )}
                        <StatusBadge value={incident.severity} />
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-white mt-2 line-clamp-2 leading-relaxed">
                      {incident.title}
                    </h4>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-400 mt-4 pt-3 border-t border-brand-border/10 font-mono">
                    <span className="text-brand-primary">{incident.service}</span>
                    <span>
                      {new Date(incident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
            {activeIncidents.length === 0 && (
              <div className="col-span-full py-8 text-center text-slate-500 font-mono text-sm">
                ✓ System operational. Zero active incidents reported.
              </div>
            )}
          </div>
          
          <div className="mt-6 pt-4 border-t border-brand-border/20 flex justify-end">
            <Link to="/incidents" className="flex items-center gap-2 py-2 px-6 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-semibold hover:bg-brand-primary/20 transition-all duration-200">
              Open Incident Command Center
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
