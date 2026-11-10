import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { GlassIconReveal } from '@/components/ui/liquid-glass-logo-reveal';
import SovereignLayout from './components/Sovereign/SovereignLayout';
import LandingPage from './landing/LandingPage';

const HomeDashboard = React.lazy(() => import('./components/Sovereign/HomeDashboard'));
const NotesLibrary = React.lazy(() => import('./components/Sovereign/NotesLibrary'));
const NoteDetail = React.lazy(() => import('./components/NoteDetail'));
const Roadmaps = React.lazy(() => import('./components/Sovereign/Roadmaps'));
const AttendanceAnalytics = React.lazy(() => import('./components/Sovereign/AttendanceAnalytics'));
const Announcements = React.lazy(() => import('./components/Sovereign/Announcements'));
const AIAssistant = React.lazy(() => import('./components/Sovereign/AIAssistant'));
const OptimizationPage = React.lazy(() => import('./components/Sovereign/OptimizationPage'));
const Settings = React.lazy(() => import('./components/Sovereign/Settings'));

const RouteLoadingFallback = () => (
  <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
    <div className="relative w-48 h-48">
      <GlassIconReveal
        logo="/icon.svg"
        label="Loading module..."
        look="light"
        background="transparent"
        logoColor="#0071E3"
        tileSize={160}
        logoScale={0.7}
        className="w-full h-full"
      />
    </div>
    <span className="text-xs text-slate-400 font-medium tracking-wide -mt-2">Loading module...</span>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <SovereignLayout />
            </Suspense>
          }
        >
          <Route path="/dashboard" element={<HomeDashboard />} />
          <Route path="/notes" element={<NotesLibrary />} />
          <Route path="/notes/:id" element={<NoteDetail />} />
          <Route path="/pyqs" element={<NotesLibrary defaultTab="pyqs" />} />
          <Route path="/roadmaps" element={<Roadmaps />} />
          <Route path="/ai-assistant" element={<AIAssistant />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/attendance" element={<AttendanceAnalytics />} />
          <Route path="/optimization" element={<OptimizationPage />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;

