export interface BandwidthMetrics {
  isOnline: boolean;
  effectiveType: string;
  rttMs: number;
  downlinkMb: number;
  lastPayloadBytes: number;
  totalTransferredBytes: number;
}

class NetworkMonitorService {
  private metrics: BandwidthMetrics = {
    isOnline: navigator.onLine,
    effectiveType: '3g',
    rttMs: 120,
    downlinkMb: 1.2,
    lastPayloadBytes: 0,
    totalTransferredBytes: 0,
  };

  private listeners: Set<(metrics: BandwidthMetrics) => void> = new Set();

  constructor() {
    window.addEventListener('online', () => this.updateOnlineStatus(true));
    window.addEventListener('offline', () => this.updateOnlineStatus(false));
  }

  private updateOnlineStatus(online: boolean) {
    this.metrics.isOnline = online;
    this.notify();
  }

  public trackTransfer(bytes: number) {
    this.metrics.lastPayloadBytes = bytes;
    this.metrics.totalTransferredBytes += bytes;
    this.notify();
  }

  public subscribe(callback: (metrics: BandwidthMetrics) => void) {
    this.listeners.add(callback);
    callback(this.metrics);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach((cb) => cb({ ...this.metrics }));
  }

  public getMetrics(): BandwidthMetrics {
    return { ...this.metrics };
  }
}

export const networkMonitor = new NetworkMonitorService();
