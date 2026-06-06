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

// Mock Data for Phase 1
const mockMetrics = [
  { name: '10:00', cpu: 32, memory: 58, errors: 0.1 },
  { name: '10:05', cpu: 35, memory: 59, errors: 0.12 },
  { name: '10:10', cpu: 38, memory: 60, errors: 0.15 },
  { name: '10:15', cpu: 85, memory: 78, errors: 4.8 }, // Anomaly Spike
  { name: '10:20', cpu: 45, memory: 62, errors: 0.5 },
  { name: '10:25', cpu: 36, memory: 59, errors: 0.2 },
  { name: '10:30', cpu: 33, memory: 58, errors: 0.1 },
];

const mockIncidents = [
  {
    id: 101,
    title: 'Connection pool exhaustion detected in payment-service',
    service: 'payment-service',
    severity: 'critical',
    status: 'open',
    created_at: '2 mins ago',
  },
  {
    id: 102,
    title: 'High latency on auth-service login endpoint',
    service: 'auth-service',
    severity: 'high',
    status: 'investigating',
    created_at: '15 mins ago',
  },
  {
    id: 103,
    title: 'Disk space warning on db-replica-01',
    service: 'database',
    severity: 'medium',
    status: 'resolved',
    created_at: '2 hours ago',
  }
];

export default function Dashboard() {
  const healthScore = 98;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Executive Dashboard
          </h2>
          <p className="text-slate-400 mt-1">
            Real-time status overview of AegisOps monitored infrastructure.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-brand-dark/50 border border-brand-border/40 backdrop-blur-lg px-4 py-2 rounded-xl text-xs text-slate-300 font-mono">
          <Clock className="w-4 h-4 text-brand-primary animate-pulse" />
          <span>Last Poll: 10:30:15 UTC</span>
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
                strokeDashoffset={2 * Math.PI * 64 * (1 - healthScore / 100)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold text-white tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {healthScore}
              </span>
              <span className="text-[10px] font-semibold text-brand-success uppercase tracking-widest mt-0.5">
                Optimal
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
            <Shield className="w-3.5 h-3.5 text-brand-success" />
            <span>Secure & Stable</span>
          </div>
        </div>

        {/* Highlight Stats Cards */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Card 1: CPU */}
          <div className="glass-card p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg CPU Usage</p>
                <h3 className="text-3xl font-bold text-white mt-2 font-mono">35.4%</h3>
              </div>
              <div className="p-2.5 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary glow-primary">
                <Cpu className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-brand-border/20 flex items-center justify-between text-xs">
              <span className="text-slate-500">Threshold: 80%</span>
              <span className="text-brand-success font-medium">Healthy</span>
            </div>
          </div>

          {/* Card 2: Memory */}
          <div className="glass-card p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Memory</p>
                <h3 className="text-3xl font-bold text-white mt-2 font-mono">61.2%</h3>
              </div>
              <div className="p-2.5 rounded-xl bg-brand-accent/10 border border-brand-accent/20 text-brand-accent">
                <HardDrive className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-brand-border/20 flex items-center justify-between text-xs">
              <span className="text-slate-500">Threshold: 85%</span>
              <span className="text-brand-success font-medium">Healthy</span>
            </div>
          </div>

          {/* Card 3: Active Incidents */}
          <div className="glass-card p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Incidents</p>
                <h3 className="text-3xl font-bold text-brand-warning mt-2 font-mono">2</h3>
              </div>
              <div className="p-2.5 rounded-xl bg-brand-warning/10 border border-brand-warning/20 text-brand-warning glow-warning">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-brand-border/20 flex items-center justify-between text-xs">
              <span className="text-slate-500">1 Critical, 1 High</span>
              <span className="text-brand-warning font-medium">Investigating</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Charts & Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Metric Chart */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col justify-between min-h-[360px]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-semibold text-white">System Performance Timeline</h3>
              <p className="text-xs text-slate-400 mt-0.5">CPU, Memory and Error Rates over the last 30 minutes</p>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 text-xs text-brand-primary">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-primary" /> CPU
              </span>
              <span className="flex items-center gap-1.5 text-xs text-brand-accent">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-accent" /> Memory
              </span>
            </div>
          </div>
          
          <div className="flex-1 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.4} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#f8fafc' 
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke="#0ea5e9" 
                  strokeWidth={2} 
                  dot={{ r: 3, fill: '#0ea5e9', strokeWidth: 0 }} 
                  activeDot={{ r: 5 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="memory" 
                  stroke="#a855f7" 
                  strokeWidth={2} 
                  dot={{ r: 3, fill: '#a855f7', strokeWidth: 0 }} 
                  activeDot={{ r: 5 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Incidents */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-white">Recent Incidents</h3>
              <Server className="w-4 h-4 text-slate-500" />
            </div>
            
            <div className="space-y-4">
              {mockIncidents.map((incident) => (
                <div 
                  key={incident.id}
                  className="p-3.5 rounded-xl border border-brand-border/30 bg-brand-darkest/40 flex flex-col gap-2 hover:border-brand-primary/20 transition-all duration-200"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-semibold text-slate-300 line-clamp-1">{incident.title}</span>
                    <StatusBadge value={incident.severity} />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                    <span className="font-mono">{incident.service}</span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                      {incident.created_at}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-brand-border/20">
            <button className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-semibold hover:bg-brand-primary/20 transition-all duration-200">
              Go to Incident Command
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
