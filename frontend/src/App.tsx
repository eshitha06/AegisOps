import { Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import Dashboard from './pages/Dashboard';
import IncidentCommand from './pages/IncidentCommand';
import AIRecommendations from './pages/AIRecommendations';
import Predictions from './pages/Predictions';
import { TelemetryModeProvider } from './context/TelemetryModeContext';
import { WebSocketProvider } from './context/WebSocketContext';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Frontend ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-darkest text-slate-100 flex items-center justify-center p-8">
          <div className="max-w-md w-full glass-card p-6 border-red-500/50 space-y-4">
            <h2 className="text-xl font-bold text-red-400 font-mono">Application Error Detected</h2>
            <p className="text-xs text-slate-300 font-mono bg-black/60 p-3 rounded border border-brand-border/40">
              {this.state.error?.message || 'Unknown runtime error'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full py-2 bg-brand-primary text-brand-darkest font-mono font-bold text-xs rounded hover:opacity-90 transition-opacity"
            >
              RELOAD CONSOLE
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <TelemetryModeProvider>
        <WebSocketProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-brand-darkest text-slate-100 flex">
              {/* Sidebar Navigation */}
              <Sidebar />

              {/* Main Application Container */}
              <div className="flex-1 pl-64 flex flex-col min-h-screen">
                <TopBar />
                
                <main className="flex-1 p-8 overflow-y-auto">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/incidents" element={<IncidentCommand />} />
                    <Route path="/recommendations" element={<AIRecommendations />} />
                    <Route path="/predictions" element={<Predictions />} />
                  </Routes>
                </main>
              </div>
            </div>
          </BrowserRouter>
        </WebSocketProvider>
      </TelemetryModeProvider>
    </ErrorBoundary>
  );
}
