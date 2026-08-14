import React, { useState, useEffect } from 'react';
import { EphemeralSession } from '../types/intake';
import { purgeSession, fetchDoctorSessions, updateSessionStatus } from '../services/api';
import {
  Stethoscope,
  Clock,
  AlertTriangle,
  Trash2,
  Search,
  UserCheck,
  ShieldCheck,
  LogOut
} from 'lucide-react';

import { subscribeToClinicSessions } from '../services/supabase';

// Sample mock queue for doctor dashboard demonstration
export const DoctorDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [sessions, setSessions] = useState<EphemeralSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [filterUrgency, setFilterUrgency] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Live Auto-Polling & Supabase Realtime Subscription of Active Clinic Sessions
  useEffect(() => {
    let isMounted = true;
    const pollLiveSessions = async () => {
      const liveBackendSessions = await fetchDoctorSessions('clinic_rural_01');
      if (isMounted) {
        setSessions(liveBackendSessions);
        if (liveBackendSessions.length > 0 && !selectedSessionId) {
          setSelectedSessionId(liveBackendSessions[0].sessionId);
        }
      }
    };

    pollLiveSessions();
    const interval = setInterval(pollLiveSessions, 3000);

    const subscription = subscribeToClinicSessions('clinic_rural_01', () => {
      pollLiveSessions();
    });

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (subscription && typeof (subscription as any).unsubscribe === 'function') {
        (subscription as any).unsubscribe();
      }
    };
  }, [selectedSessionId]);



  const selectedSession = sessions.find((s) => s.sessionId === selectedSessionId) || sessions[0];

  const handleStatusChange = async (status: EphemeralSession['status']) => {
    if (!selectedSession) return;
    await updateSessionStatus(selectedSession.sessionId, status);
    setSessions((prev) =>
      prev.map((s) => (s.sessionId === selectedSession.sessionId ? { ...s, status } : s))
    );
  };


  const handleCompleteAndPurge = async () => {
    if (!selectedSession) return;
    await purgeSession(selectedSession.sessionId);
    setSessions((prev) => prev.filter((s) => s.sessionId !== selectedSession.sessionId));
    if (sessions.length > 1) {
      const remaining = sessions.filter((s) => s.sessionId !== selectedSession.sessionId);
      setSelectedSessionId(remaining[0].sessionId);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    const matchesUrgency = filterUrgency === 'ALL' || s.urgency?.level === filterUrgency;
    const complaintText = s.structuredIntake?.chief_complaint || '';
    const matchesSearch =
      (s.token || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaintText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.language || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesUrgency && matchesSearch;
  });


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="bg-teal-500/20 p-2.5 rounded-xl border border-teal-500/40">
            <Stethoscope className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">VaaniDoc Doctor Dashboard</h1>
            <p className="text-xs text-teal-400 font-medium">Primary Care Triage & Realtime Clinical Intake</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2 text-xs bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">Live Firestore Sync</span>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg border border-slate-700 transition-all"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* Left Column: Waiting Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Queue Filter Controls */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Waiting Queue ({sessions.length})
              </span>
              <div className="flex space-x-1 text-[11px]">
                {['ALL', 'EMERGENCY', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setFilterUrgency(lvl)}
                    className={`px-2 py-0.5 rounded font-semibold transition-all ${
                      filterUrgency === lvl
                        ? 'bg-teal-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search token, symptom, language..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Session Cards List */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredSessions.length === 0 ? (
              <div className="bg-slate-900 p-8 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
                No waiting sessions matching filter.
              </div>
            ) : (
              filteredSessions.map((s) => {
                const isSelected = s.sessionId === selectedSession?.sessionId;
                const isEmergency = s.urgency?.level === 'EMERGENCY';
                const isHigh = s.urgency?.level === 'HIGH';

                return (
                  <div
                    key={s.sessionId}
                    onClick={() => setSelectedSessionId(s.sessionId)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-teal-950/60 border-teal-400/80 shadow-lg ring-1 ring-teal-400/30'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {s.token || '#A-00'}
                        </span>
                        <span className="text-[10px] text-teal-400 font-mono bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-800/40">
                          {s.language}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded tracking-wide ${
                          isEmergency
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                            : isHigh
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {s.urgency?.level}
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 line-clamp-1 font-medium">
                      {s.structuredIntake?.chief_complaint || 'Pending extraction'}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>Wait: ~12 mins</span>
                      </span>

                      <span className="capitalize text-[10px] text-slate-400 font-semibold">
                        Status: <span className="text-teal-300">{s.status}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Intake View (7 cols) */}
        {selectedSession && (
          <div className="lg:col-span-7 space-y-4">
            {/* Header & Status Actions */}
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold text-white">Intake Detail — Token {selectedSession.token}</h2>
                    <span className="text-xs text-slate-400 font-mono">({selectedSession.sessionId})</span>
                  </div>
                  <p className="text-xs text-teal-400">Language: {selectedSession.language} | Created: 12 min ago</p>
                </div>

                <div className="flex space-x-2">
                  {selectedSession.status === 'waiting' && (
                    <button
                      onClick={() => handleStatusChange('in_consultation')}
                      className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-3.5 py-2 rounded-lg text-xs flex items-center space-x-1 shadow-md"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Start Consultation</span>
                    </button>
                  )}

                  <button
                    onClick={handleCompleteAndPurge}
                    className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold px-3.5 py-2 rounded-lg text-xs flex items-center space-x-1 transition-all"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Complete & Purge Data</span>
                  </button>
                </div>
              </div>

              {/* Urgency Callout Banner */}
              <div
                className={`p-3.5 rounded-xl border flex items-start space-x-3 text-xs ${
                  selectedSession.urgency?.level === 'EMERGENCY'
                    ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                    : selectedSession.urgency?.level === 'HIGH'
                    ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                    : 'bg-teal-950/40 border-teal-500/50 text-teal-200'
                }`}
              >
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block uppercase tracking-wider text-[10px]">
                    Urgency Triage: {selectedSession.urgency?.level}
                  </span>
                  <p className="text-xs mt-0.5 leading-normal">{selectedSession.urgency?.reason}</p>
                </div>
              </div>
            </div>

            {/* Side-by-Side: Transcript & Structured Intake */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original Transcript */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Original Regional Transcript ({selectedSession.language})
                </span>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans min-h-[100px]">
                  {selectedSession.transcript}
                </div>
              </div>

              {/* Chief Complaint & Categories */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 block">
                  Chief Complaint (English)
                </span>
                <p className="text-xs text-white font-medium bg-slate-950 p-3 rounded-lg border border-slate-800">
                  {selectedSession.structuredIntake?.chief_complaint}
                </p>
              </div>
            </div>

            {/* Structured Symptoms Table */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Extracted Symptoms & Clinical Parameters
              </span>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
                      <th className="pb-2">Symptom</th>
                      <th className="pb-2">Normalized Term</th>
                      <th className="pb-2">Location</th>
                      <th className="pb-2">Duration</th>
                      <th className="pb-2">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {(selectedSession.structuredIntake?.symptoms || []).map((sym, idx) => (
                      <tr key={idx} className="text-slate-200">
                        <td className="py-2.5 font-medium text-teal-300">{sym.name}</td>
                        <td className="py-2.5 italic text-slate-400 text-[11px]">{sym.normalized_name}</td>
                        <td className="py-2.5">{sym.location || 'Systemic'}</td>
                        <td className="py-2.5">{sym.duration || 'Acute'}</td>
                        <td className="py-2.5">
                          <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px]">{sym.severity}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Categories & Missing Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Possible Symptom Categories (Not Diagnosis)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedSession.structuredIntake?.possible_symptom_categories || []).map((cat, idx) => (
                    <span key={idx} className="bg-teal-950/80 border border-teal-500/30 text-teal-300 text-xs px-2.5 py-1 rounded-lg">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                  Missing Information Flags
                </span>
                <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                  {(selectedSession.structuredIntake?.missing_information || []).map((info, idx) => (
                    <li key={idx}>{info}</li>
                  ))}
                </ul>
              </div>
            </div>


            {/* Privacy Compliance Footer */}
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Ephemeral Session Protocol Active — No medical data saved permanently.</span>
              </div>
              <span className="font-mono text-slate-500 text-[10px]">Session TTL: {selectedSession.expiresAt}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
