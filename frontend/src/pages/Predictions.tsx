import { useState } from 'react';
import { 
  Clock, 
  ShieldAlert, 
  CheckCircle,
  HelpCircle,
  Server
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface ServicePrediction {
  service: string;
  riskScore: number;
  etaMinutes: number | null;
  status: 'critical' | 'warning' | 'stable';
  trend: 'up' | 'down' | 'flat';
  metricName: string;
  threshold: number;
  data: { time: string; actual: number; predicted?: number }[];
}

const mockPredictions: ServicePrediction[] = [
  {
    service: 'payment-service',
    riskScore: 78,
    etaMinutes: 12,
    status: 'critical',
    trend: 'up',
    metricName: 'Database Connections',
    threshold: 40,
    data: [
      { time: '10:00', actual: 8 },
      { time: '10:05', actual: 12 },
      { time: '10:10', actual: 15 },
      { time: '10:15', actual: 28 },
      { time: '10:20', actual: 35, predicted: 35 },
      { time: '10:25', actual: 35, predicted: 39 }, // Projected threshold cross
      { time: '10:30', actual: 35, predicted: 44 },
    ]
  },
  {
    service: 'auth-service',
    riskScore: 45,
    etaMinutes: 105, // 1h 45m
    status: 'warning',
    trend: 'up',
    metricName: 'CPU Usage %',
    threshold: 85,
    data: [
      { time: '10:00', actual: 42 },
      { time: '10:05', actual: 48 },
      { time: '10:10', actual: 55 },
      { time: '10:15', actual: 62 },
      { time: '10:20', actual: 68, predicted: 68 },
      { time: '10:25', actual: 68, predicted: 75 },
      { time: '10:30', actual: 68, predicted: 81 },
    ]
  },
  {
    service: 'database',
    riskScore: 12,
    etaMinutes: null,
    status: 'stable',
    trend: 'flat',
    metricName: 'Disk Usage %',
    threshold: 90,
    data: [
      { time: '10:00', actual: 41 },
      { time: '10:05', actual: 41 },
      { time: '10:10', actual: 42 },
      { time: '10:15', actual: 42 },
      { time: '10:20', actual: 42, predicted: 42 },
      { time: '10:25', actual: 42, predicted: 42.5 },
      { time: '10:30', actual: 42, predicted: 43 },
    ]
  },
  {
    service: 'api-gateway',
    riskScore: 8,
    etaMinutes: null,
    status: 'stable',
    trend: 'down',
    metricName: 'Error Rate %',
    threshold: 5,
    data: [
      { time: '10:00', actual: 0.8 },
      { time: '10:05', actual: 0.7 },
      { time: '10:10', actual: 0.5 },
      { time: '10:15', actual: 0.3 },
      { time: '10:20', actual: 0.2, predicted: 0.2 },
      { time: '10:25', actual: 0.2, predicted: 0.15 },
      { time: '10:30', actual: 0.2, predicted: 0.1 },
    ]
  }
];

export default function Predictions() {
  const [selectedService, setSelectedService] = useState<string>('payment-service');

  const selectedData = mockPredictions.find(p => p.service === selectedService) || mockPredictions[0];

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-brand-danger bg-brand-danger/10 border-brand-danger/30';
    if (score >= 30) return 'text-brand-warning bg-brand-warning/10 border-brand-warning/30';
    return 'text-brand-success bg-brand-success/10 border-brand-success/30';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Failure Predictions
        </h2>
        <p className="text-slate-400 mt-1">
          Machine Learning models scan trend lines to estimate resource saturation thresholds and Time-To-Failure (ETA).
        </p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Services List */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Service Risk Assessment
          </h3>
          <div className="space-y-3">
            {mockPredictions.map((pred) => {
              const isSelected = pred.service === selectedService;
              
              return (
                <div
                  key={pred.service}
                  onClick={() => setSelectedService(pred.service)}
                  className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer flex justify-between items-center ${
                    isSelected
                      ? 'bg-brand-primary/10 border-brand-primary/40 shadow-lg glow-primary'
                      : 'bg-brand-dark/50 border-brand-border/30 hover:border-brand-border/60 hover:bg-brand-card/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-brand-darkest border border-brand-border/30 text-brand-primary">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-mono">
                        {pred.service}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        TREND: {pred.trend.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-mono font-bold border ${getRiskColor(pred.riskScore)}`}>
                      {pred.riskScore}% RISK
                    </span>
                    {pred.etaMinutes ? (
                      <p className="text-[10px] text-brand-danger font-bold mt-1.5 flex items-center justify-end gap-1 font-mono">
                        <Clock className="w-3 h-3 animate-pulse" />
                        ETA ~{pred.etaMinutes}m
                      </p>
                    ) : (
                      <p className="text-[10px] text-brand-success font-semibold mt-1.5 flex items-center justify-end gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Stable
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Trend Extrapolation Chart */}
        <div className="lg:col-span-7">
          <div className="glass-card p-6 min-h-[460px] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start border-b border-brand-border/30 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white font-mono capitalize">
                    {selectedData.service} Trend Analysis
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Metric: <span className="font-semibold text-slate-300">{selectedData.metricName}</span>
                  </p>
                </div>
                {selectedData.status === 'critical' ? (
                  <div className="flex items-center gap-1.5 text-xs text-brand-danger bg-brand-danger/10 px-3 py-1 rounded-lg border border-brand-danger/30 glow-danger font-bold">
                    <ShieldAlert className="w-4 h-4" />
                    CRITICAL LIMIT EXTRAPOLATION
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-brand-success bg-brand-success/10 px-3 py-1 rounded-lg border border-brand-success/30 font-bold">
                    <CheckCircle className="w-4 h-4" />
                    TREND WITHIN THRESHOLD
                  </div>
                )}
              </div>

              {/* Prediction details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-brand-darkest/50 border border-brand-border/20 rounded-xl p-3.5 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Risk Index</span>
                  <p className="text-xl font-extrabold text-white mt-1 font-mono">{selectedData.riskScore}%</p>
                </div>
                <div className="bg-brand-darkest/50 border border-brand-border/20 rounded-xl p-3.5 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Projected Satiation</span>
                  <p className="text-xl font-extrabold text-brand-warning mt-1 font-mono">
                    {selectedData.etaMinutes ? `~${selectedData.etaMinutes} mins` : 'N/A'}
                  </p>
                </div>
                <div className="bg-brand-darkest/50 border border-brand-border/20 rounded-xl p-3.5 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Metric Threshold</span>
                  <p className="text-xl font-extrabold text-slate-400 mt-1 font-mono">{selectedData.threshold}</p>
                </div>
              </div>

              {/* Chart container */}
              <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedData.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.4} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#f8fafc' 
                      }} 
                    />
                    {/* Danger Threshold Line */}
                    <ReferenceLine 
                      y={selectedData.threshold} 
                      stroke="#ef4444" 
                      strokeDasharray="4 4" 
                      strokeWidth={1.5}
                      label={{ 
                        value: 'CRITICAL LIMIT', 
                        fill: '#ef4444', 
                        fontSize: 9, 
                        position: 'insideBottomRight',
                        fontWeight: 'bold',
                        fontFamily: 'monospace'
                      }} 
                    />
                    {/* Actual data line */}
                    <Line 
                      type="monotone" 
                      dataKey="actual" 
                      stroke="#0ea5e9" 
                      strokeWidth={2} 
                      name="Observed"
                      dot={{ r: 3, fill: '#0ea5e9', strokeWidth: 0 }} 
                    />
                    {/* Projected/Predicted trend extrapolation */}
                    <Line 
                      type="monotone" 
                      dataKey="predicted" 
                      stroke="#a855f7" 
                      strokeDasharray="3 3" 
                      strokeWidth={2} 
                      name="Projected Trend"
                      dot={{ r: 3, fill: '#a855f7', strokeWidth: 0 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-brand-border/20 text-xs text-slate-500 font-medium flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Extrapolation is calculated using linear regression on the last 50 data points of the telemetry batch.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
