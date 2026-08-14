import React, { useState } from 'react';
import { PatientFlow } from './pages/PatientFlow';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { DoctorLogin } from './pages/DoctorLogin';
import { BandwidthDemoPanel } from './components/demo/BandwidthDemoPanel';

export const App: React.FC = () => {
  const [view, setView] = useState<'patient' | 'doctor_login' | 'doctor_dashboard'>('patient');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-teal-500 selection:text-white">
      {view === 'patient' && <PatientFlow onNavigateToDoctor={() => setView('doctor_login')} />}
      {view === 'doctor_login' && (
        <DoctorLogin
          onLoginSuccess={() => setView('doctor_dashboard')}
          onBackToPatient={() => setView('patient')}
        />
      )}
      {view === 'doctor_dashboard' && <DoctorDashboard onLogout={() => setView('patient')} />}

      {/* Global Bandwidth & Privacy Demo Panel */}
      <BandwidthDemoPanel />
    </div>
  );
};

export default App;
