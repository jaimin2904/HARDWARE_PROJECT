# VaaniDoc Low-Bandwidth & Offline Architecture Specification

## 1. Network Constraints & Performance Target
VaaniDoc is specifically designed for 2G / 3G rural mobile networks characterized by bandwidth < 100 KB/s, high latency (> 500ms), and frequent packet loss.

---

## 2. Low-Bandwidth Optimization Techniques

### 2.1 Asset Bundle Optimization
- Vite code-splitting and tree-shaking produce a total compressed initial JS/CSS app shell bundle of **< 150 KB**.
- Service Worker caches the app shell on first load, enabling instant loads on subsequent visits even with zero connectivity.

### 2.2 Payload Minimization & Audio Compression
- Client-side Opus/WebM audio encoding reduces recording payload size from ~1 MB (raw WAV) to **< 50 KB** for a 15-second narration.
- Preference for text input or client-side transcription where supported by Web Speech API, drastically reducing uplink data transfer.

---

## 3. Offline Capabilities & Resilient Network Queue

```
                  ┌───────────────────────────────┐
                  │    Patient Voice/Text Input   │
                  └───────────────┬───────────────┘
                                  │
                       [Network Available?]
                         /             \
                       YES              NO
                       /                 \
                      ▼                   ▼
            ┌──────────────────┐  ┌──────────────────────────────┐
            │ Submit via REST  │  │ Store in IndexedDB Queue     │
            └──────────────────┘  │ - Ephemeral local storage    │
                                  │ - Network listener active    │
                                  └───────────────┬──────────────┘
                                                  │
                                          [Network Restored]
                                                  │
                                                  ▼
                                  ┌──────────────────────────────┐
                                  │ Replay Queue w/ Backoff      │
                                  │ Idempotency key prevents     │
                                  │ duplicate sessions           │
                                  └──────────────────────────────┘
```

---

## 4. Connectivity State Machine

| State | UI Display & Indicator | Action / Behavior |
|---|---|---|
| **ONLINE (Good)** | Green connection pill | Full real-time sync enabled. |
| **POOR (Sub-100KB/s)** | Amber connection pill | Audio compression ratio increased; progress bar displays upload byte transfer. |
| **OFFLINE** | Red connection pill + Notice | Patient input queued locally in IndexedDB. Retries silently in background. |
| **RECONNECTING** | Pulsing sync icon | Processing queued requests using exponential backoff retry. |

---

## 5. Live Bandwidth Demo Monitor Component
The application features a built-in Dev/Demo Bandwidth Monitor panel displaying:
- Current connection state & measured latency.
- Total bytes transferred per request.
- Proof of operation under simulated 50 KB/s throttled network conditions.
