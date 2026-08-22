import { useState, useEffect } from 'react';
import { 
  AlertOctagon, 
  Play, 
  Terminal, 
  Clock,
  AlertCircle
} from 'lucide-react';
import StatusBadge from '../components/ui/StatusBadge';
import ConfidenceBar from '../components/ui/ConfidenceBar';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import IncidentCard from '../components/cards/IncidentCard';
import useIncidents from '../hooks/useIncidents';
import { api } from '../api/client';

export default function IncidentCommand() {
  const { incidents, loading, refresh } = useIncidents();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rcaRunning, setRcaRunning] = useState<boolean>(false);
  const [activeRcaResult, setActiveRcaResult] = useState<{
    root_cause: string;
    confidence: number;
    timeline: string[];
    recommendations: string[];
  } | null>(null);

  // Auto-select the first incident if nothing is selected yet
  useEffect(() => {
    if (incidents.length > 0 && selectedId === null) {
      setSelectedId(incidents[0].id);
    }
  }, [incidents, selectedId]);

  const selectedIncident = incidents.find(inc => inc.id === selectedId) || null;

  const handleRunRCA = async (id: number) => {
    setRcaRunning(true);
    setActiveRcaResult(null);
    try {
      const result = await api.runRCA(id);
      setActiveRcaResult({
        root_cause: result.root_cause,
        confidence: result.confidence,
        timeline: result.timeline || [],
        recommendations: result.recommendations || []
      });
      refresh();
    } catch (err) {
      console.error('RCA running failed:', err);
    } finally {
      setRcaRunning(false);
    }
  };

  // Determine timeline and recommendations for the selected incident
  let rootCause = selectedIncident?.root_cause || '';
  let confidence = selectedIncident?.confidence_score || 0;
  let timeline: string[] = [];
  let recommendations: string[] = [];

  if (activeRcaResult && selectedIncident?.id === selectedId) {
    rootCause = activeRcaResult.root_cause;
    confidence = activeRcaResult.confidence;
    timeline = activeRcaResult.timeline;
    recommendations = activeRcaResult.recommendations;
  } else if (selectedIncident?.recovery_action) {
    try {
      const parsed = JSON.parse(selectedIncident.recovery_action);
      timeline = parsed.timeline || [];
      recommendations = parsed.recommendations || [];
    } catch (e) {
      recommendations = [selectedIncident.recovery_action];
    }
  }

  if (loading && incidents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

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
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {incidents.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                isSelected={incident.id === selectedId}
                onClick={() => {
                  setSelectedId(incident.id);
                  setActiveRcaResult(null); // Clear previous temp result when switching
                }}
              />
            ))}
            {incidents.length === 0 && (
              <p className="text-slate-500 text-sm font-mono py-4">No incidents logged.</p>
            )}
          </div>
        </div>

        {/* Right Side: Incident Details & RCA Panel */}
        <div className="lg:col-span-8">
          {selectedIncident ? (
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
                {rcaRunning && (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                    <LoadingSpinner size="lg" className="mb-4" />
                    <h4 className="text-base font-bold text-white">Querying Vector Knowledge Base...</h4>
                    <p className="text-sm text-slate-400 max-w-xs mt-2 animate-pulse">
                      Retrieving historic runbooks, scanning metrics, and calling Gemini 1.5 Flash...
                    </p>
                  </div>
                )}

                {!rcaRunning && !rootCause && (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                    <AlertCircle className="w-16 h-16 text-slate-600 mb-4 animate-pulse" />
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

                {!rcaRunning && rootCause && (
                  <div className="space-y-6 animate-fade-in">
                    {/* Root Cause Box */}
                    <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-5">
                      <div className="flex items-center gap-2 text-brand-primary font-bold text-sm mb-2">
                        <Terminal className="w-4 h-4" />
                        <span>AI Root Cause Identification</span>
                      </div>
                      <p className="text-white font-medium leading-relaxed">
                        {rootCause}
                      </p>
                      <div className="mt-4 pt-4 border-t border-brand-border/20 max-w-md">
                        <ConfidenceBar score={confidence} />
                      </div>
                    </div>

                    {/* Causal Chain Timeline */}
                    {timeline.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          Causal Chain Timeline
                        </h4>
                        <div className="relative border-l-2 border-brand-border/40 ml-3 pl-6 space-y-5">
                          {timeline.map((step, index) => {
                            const parts = step.split(' - ');
                            const time = parts[0];
                            const desc = parts.slice(1).join(' - ');
                            return (
                              <div key={index} className="relative">
                                {/* Dot marker */}
                                <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-brand-primary border-2 border-brand-darkest shadow-md glow-primary" />
                                <p className="text-xs font-semibold text-slate-400 font-mono">{time}</p>
                                <p className="text-sm font-medium text-slate-200 mt-1">{desc}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* AI Recommendations */}
                    {recommendations.length > 0 && (
                      <div className="pt-4 border-t border-brand-border/20">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                          Next Action Recommendations
                        </h4>
                        <ul className="space-y-2">
                          {recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-2.5 text-sm text-slate-300">
                              <span className="flex-shrink-0 w-5 h-5 rounded bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-bold flex items-center justify-center font-mono mt-0.5">
                                {index + 1}
                              </span>
                              <span className="leading-snug">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-card p-6 min-h-[500px] flex items-center justify-center text-slate-500 text-sm font-mono">
              Select an incident from the list to review details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
