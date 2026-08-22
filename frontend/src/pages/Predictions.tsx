import { useEffect, useState } from 'react';
import { Activity, Clock, Server } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { api } from '../api/client';
import { Metric } from '../types';

interface PredictionData { service: string; risk_score: number | null; estimated_time_to_failure_minutes: number | null; status: string; trend_direction: string; metric: string; current_value: number | null; data_points: number; data_window_start: string | null; data_window_end: string | null; confidence: number | null; }
const SERVICES = ['api', 'worker'];

export default function Predictions() {
  const [selectedService, setSelectedService] = useState('api');
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const refresh = async () => { try { const [p, m] = await Promise.all([api.getPredictions(selectedService), api.getMetrics(selectedService)]); if (active) { setPrediction(p); setMetrics(m); setError(null); } } catch { if (active) setError('WAITING FOR TELEMETRY'); } finally { if (active) setLoading(false); } };
    setLoading(true); refresh(); const interval = setInterval(refresh, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [selectedService]);
  const chart = metrics.slice(0, 20).reverse().map(m => ({ time: new Date(m.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), latency: m.latency_ms }));
  const insufficient = !prediction || prediction.status === 'insufficient_data';
  const risk = prediction?.risk_score;
  return <div className="space-y-6 animate-fade-in">
    <div className="flex items-end justify-between border-b border-brand-border pb-4"><div><h2 className="text-2xl font-bold text-white">Trend Forecasts</h2><p className="mt-1 text-sm text-slate-400">REAL telemetry only · Resilio PostgreSQL observation window</p></div><span className="font-mono text-xs text-slate-500">SOURCE: demo-env → Prometheus → Resilio</span></div>
    {error && <div className="border border-brand-danger/40 bg-brand-danger/10 p-3 font-mono text-sm text-brand-danger">{error}</div>}
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4"><section className="space-y-2 lg:col-span-1"><p className="section-label">Monitored services</p>{SERVICES.map(service => <button key={service} onClick={() => setSelectedService(service)} className={`w-full border p-4 text-left ${service === selectedService ? 'border-brand-primary bg-brand-primary/10' : 'border-brand-border bg-brand-dark hover:border-slate-500'}`}><div className="flex items-center gap-2"><Server className="h-4 w-4 text-brand-primary" /><span className="font-mono text-sm font-bold text-white">{service}</span></div><p className="mt-2 text-xs uppercase text-slate-500">{service === selectedService && prediction ? prediction.trend_direction : 'select to load'}</p></button>)}</section>
      <section className="glass-card p-5 lg:col-span-3">{loading && !prediction ? <div className="flex h-72 items-center justify-center"><LoadingSpinner size="lg" /></div> : insufficient ? <div className="flex h-72 flex-col items-center justify-center text-center"><Activity className="mb-3 h-7 w-7 text-slate-600" /><p className="font-mono text-sm text-slate-400">INSUFFICIENT DATA</p><p className="mt-1 text-xs text-slate-500">{prediction?.data_points ?? 0}/5 real observations available for {selectedService}.</p></div> : <><div className="flex flex-wrap items-start justify-between gap-4 border-b border-brand-border/60 pb-4"><div><p className="section-label">{selectedService} · {prediction.metric}</p><h3 className="mt-1 text-lg font-bold text-white">Observed latency trend</h3></div><div className={`border px-3 py-1 font-mono text-xs font-bold ${risk! >= .7 ? 'border-brand-danger text-brand-danger' : risk! >= .3 ? 'border-brand-warning text-brand-warning' : 'border-brand-success text-brand-success'}`}>{Math.round(risk! * 100)}% RISK</div></div>
        <div className="mt-4 grid grid-cols-2 gap-px border border-brand-border bg-brand-border md:grid-cols-4"><div className="bg-brand-dark p-3"><p className="section-label">Current</p><p className="mt-1 font-mono text-lg text-white">{prediction.current_value?.toFixed(1)} ms</p></div><div className="bg-brand-dark p-3"><p className="section-label">Trend</p><p className="mt-1 font-mono text-lg text-white">{prediction.trend_direction}</p></div><div className="bg-brand-dark p-3"><p className="section-label">Horizon</p><p className="mt-1 font-mono text-lg text-white">{prediction.estimated_time_to_failure_minutes ? `${prediction.estimated_time_to_failure_minutes}m` : '—'}</p></div><div className="bg-brand-dark p-3"><p className="section-label">Data quality</p><p className="mt-1 font-mono text-lg text-white">{Math.round((prediction.confidence ?? 0) * 100)}%</p></div></div>
        <div className="mt-4 h-60">{chart.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={chart}><CartesianGrid stroke="#32343a" strokeDasharray="3 3"/><XAxis dataKey="time" stroke="#787b84" fontSize={10}/><YAxis stroke="#787b84" fontSize={10}/><Tooltip contentStyle={{ background: '#151518', border: '1px solid #45454d', borderRadius: 0 }}/><Line type="monotone" dataKey="latency" stroke="#e33b45" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center font-mono text-sm text-slate-500">WAITING FOR TELEMETRY</div>}</div>
        <div className="mt-3 flex items-center gap-2 border-t border-brand-border pt-3 text-xs text-slate-500"><Clock className="h-3.5 w-3.5"/>Data window: {prediction.data_window_start} — {prediction.data_window_end} · {prediction.data_points} real samples · data quality is sample coverage, not measured predictive accuracy.</div></>}</section></div>
  </div>;
}
