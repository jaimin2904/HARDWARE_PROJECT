import React, { useState, useEffect } from 'react';
import { networkMonitor, BandwidthMetrics } from '../../services/offlineService';
import { Activity, ShieldCheck, Wifi, HardDrive, Trash2 } from 'lucide-react';

export const BandwidthDemoPanel: React.FC<{ activeSessionId?: string }> = ({ activeSessionId }) => {
  const [metrics, setMetrics] = useState<BandwidthMetrics>(networkMonitor.getMetrics());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const cleanup = networkMonitor.subscribe(setMetrics);
    return () => {
      cleanup();
    };
  }, []);


  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isExpanded ? (
        <div className="glass-panel p-4 rounded-xl shadow-2xl border border-teal-500/30 w-80 text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
            <div className="flex items-center space-x-2 text-teal-400 font-semibold">
              <Activity className="w-4 h-4" />
              <span>VaaniDoc Dev/Demo Monitor</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-slate-400 hover:text-white text-sm font-bold"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-slate-300">
            <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded">
              <span className="flex items-center space-x-1">
                <Wifi className="w-3.5 h-3.5 text-teal-400" />
                <span>Connection Status:</span>
              </span>
              <span
                className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${
                  metrics.isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {metrics.isOnline ? 'ONLINE (<100 KB/s OK)' : 'OFFLINE (Queued)'}
              </span>
            </div>

            <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded">
              <span className="flex items-center space-x-1">
                <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                <span>Last Payload Size:</span>
              </span>
              <span className="font-mono text-teal-300 font-medium">
                {(metrics.lastPayloadBytes / 1024).toFixed(2)} KB
              </span>
            </div>

            <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded">
              <span className="flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Privacy Mode:</span>
              </span>
              <span className="text-purple-300 font-medium">Zero Data Retention</span>
            </div>

            {activeSessionId && (
              <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded">
                <span className="flex items-center space-x-1">
                  <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Session TTL:</span>
                </span>
                <span className="text-amber-300 font-mono">Auto-purge on Consult</span>
              </div>
            )}
          </div>

          <div className="text-[10px] text-slate-400 bg-teal-950/40 p-2 rounded border border-teal-800/40 leading-tight">
            ✓ Operable under 100 KB/s rural network constraint. Patient medical data never saved permanently.
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center space-x-2 bg-slate-900/90 hover:bg-slate-800 border border-teal-500/40 px-3 py-2 rounded-full shadow-lg text-xs font-medium text-teal-300 transition-all hover:scale-105"
        >
          <Activity className="w-4 h-4 animate-pulse text-teal-400" />
          <span>Bandwidth & Privacy Monitor</span>
        </button>
      )}
    </div>
  );
};
