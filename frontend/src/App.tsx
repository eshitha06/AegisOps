import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import Dashboard from './pages/Dashboard';
import IncidentCommand from './pages/IncidentCommand';
import AIRecommendations from './pages/AIRecommendations';
import Predictions from './pages/Predictions';

export default function App() {
  return (
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
  );
}
