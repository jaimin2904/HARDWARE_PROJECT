import React, { useState, useEffect } from 'react';
import { SUPPORTED_LANGUAGES } from '../services/languageRegistry';
import { createSession, submitSessionInput, extractClinicalIntake } from '../services/api';
import { EphemeralSession, ClinicalIntake, LanguageOption } from '../types/intake';
import { networkMonitor } from '../services/offlineService';
import {
  Mic,
  MicOff,
  Type,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Lock,
  Stethoscope,
  Volume2
} from 'lucide-react';

export const PatientFlow: React.FC<{ onNavigateToDoctor: () => void }> = ({ onNavigateToDoctor }) => {
  const [step, setStep] = useState<number>(1);
  const [selectedLang, setSelectedLang] = useState<LanguageOption>(SUPPORTED_LANGUAGES[0]);
  const [session, setSession] = useState<EphemeralSession | null>(null);
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [textInput, setTextInput] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  
  // AI extraction states
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractedIntake, setExtractedIntake] = useState<ClinicalIntake | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);



  // Timer for voice recorder
  useEffect(() => {
    let timer: any;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const handleStartSession = async () => {
    try {
      setErrorMsg(null);
      const newSession = await createSession('clinic_rural_01', selectedLang.code);
      setSession(newSession);
      setStep(3); // Consent screen
    } catch (err: any) {
      setErrorMsg('Network error starting session. Please try again.');
    }
  };

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const speechRecognitionRef = React.useRef<any>(null);

  const handleMicToggle = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const recordedBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setAudioBlob(recordedBlob);
          networkMonitor.trackTransfer(recordedBlob.size);
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorderRef.current = recorder;
        recorder.start();
        setIsRecording(true);

        // Web Speech API for Realtime Speech-to-Text Recognition in Native Language
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          try {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = selectedLang.code;

            recognition.onresult = (event: any) => {
              let spokenText = '';
              for (let i = 0; i < event.results.length; i++) {
                spokenText += event.results[i][0].transcript;
              }
              if (spokenText.trim()) {
                setTranscript(spokenText);
                setTextInput(spokenText);
              }
            };

            recognition.start();
            speechRecognitionRef.current = recognition;
          } catch (srErr) {
            console.warn('Browser SpeechRecognition error:', srErr);
          }
        }
      } catch (err) {
        console.warn('Microphone access unavailable or denied. Operating in standard input mode.', err);
        setIsRecording(true);
      }
    } else {
      setIsRecording(false);

      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (e) {}
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      } else {
        const dummyBlob = new Blob(['mock audio data'], { type: 'audio/webm' });
        setAudioBlob(dummyBlob);
        networkMonitor.trackTransfer(dummyBlob.size);
      }
    }
  };



  const handleProcessInput = async () => {
    if (!session) return;
    setIsExtracting(true);
    setErrorMsg(null);
    setStep(6); // Processing

    try {
      const finalInputText = (inputMode === 'text' ? textInput : transcript || textInput).trim();
      if (!finalInputText) {
        setErrorMsg('No symptoms detected. Please speak or type your symptoms.');
        setIsExtracting(false);
        setStep(5);
        return;
      }

      const res = await submitSessionInput(session.sessionId, inputMode, finalInputText, audioBlob || undefined);
      const intake = await extractClinicalIntake(session.sessionId, res.transcript, selectedLang.code);
      
      setTranscript(res.transcript);
      setExtractedIntake(intake);
      setIsExtracting(false);
      setStep(7); // Confirmation
    } catch (err: any) {
      setIsExtracting(false);
      setErrorMsg('AI Extraction failed. Please review your transcript.');
    }
  };


  const handleFinalSubmit = () => {
    setStep(8); // Completed screen with Token
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col justify-between p-4 pb-20">
      {/* Header Bar */}
      <header className="flex items-center justify-between py-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="bg-teal-500/20 p-2 rounded-lg border border-teal-500/30">
            <Stethoscope className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white leading-tight">VaaniDoc</h1>
            <p className="text-[10px] text-teal-400 font-medium">Multilingual Rural Health Intake</p>
          </div>
        </div>

        <button
          onClick={onNavigateToDoctor}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1.5 rounded-lg flex items-center space-x-1 transition-all"
        >
          <Lock className="w-3 h-3 text-teal-400" />
          <span>Doctor Portal</span>
        </button>
      </header>

      {/* Progress Dots */}
      <div className="flex justify-center space-x-1.5 my-3">
        {[1, 2, 3, 4, 5, 7, 8].map((s) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step === s ? 'w-6 bg-teal-400' : step > s ? 'w-2 bg-teal-800' : 'w-2 bg-slate-800'
            }`}
          />
        ))}
      </div>

      {/* Main Card Content */}
      <main className="flex-1 flex flex-col justify-center my-2">
        {/* STEP 1: Welcome & Disclaimer */}
        {step === 1 && (
          <div className="space-y-6 text-center animate-fadeIn">
            <div className="bg-teal-950/60 p-6 rounded-2xl border border-teal-500/30 shadow-xl">
              <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-teal-400/40">
                <Volume2 className="w-8 h-8 text-teal-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Speak Your Health Symptoms</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Describe how you feel in your own mother tongue. VaaniDoc transcribes and translates your narration for the doctor instantly.
              </p>
            </div>

            <div className="bg-amber-950/40 border border-amber-500/30 p-4 rounded-xl text-left text-xs space-y-2">
              <div className="flex items-center space-x-2 text-amber-400 font-semibold">
                <ShieldAlert className="w-4 h-4" />
                <span>Notice: Decision Support Tool</span>
              </div>
              <p className="text-slate-300 leading-normal">
                VaaniDoc assists doctors with intake organization. It does <strong>not</strong> make medical diagnoses or prescribe medications.
              </p>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-3.5 rounded-xl shadow-lg shadow-teal-500/20 flex items-center justify-center space-x-2 text-base transition-all"
            >
              <span>Select Language</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STEP 2: Language Selection Grid */}
        {step === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="text-center">
              <h2 className="text-lg font-bold text-white">Choose Your Language</h2>
              <p className="text-xs text-slate-400">Select the language you speak comfortably</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLang(lang)}
                  className={`p-3.5 rounded-xl text-left border transition-all ${
                    selectedLang.code === lang.code
                      ? 'bg-teal-950/80 border-teal-400 ring-2 ring-teal-400/30'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-base font-bold text-teal-300">{lang.name}</div>
                  <div className="text-xs text-slate-400">{lang.englishName}</div>
                </button>
              ))}
            </div>

            <button
              onClick={handleStartSession}
              className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center space-x-2 text-base transition-all"
            >
              <span>Continue in {selectedLang.englishName}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STEP 3: Privacy & Session Consent */}
        {step === 3 && (
          <div className="space-y-5 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto text-purple-400 border border-purple-500/30">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white">Privacy & Zero Retention</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your voice audio and transcript are strictly temporary. After your consultation with the doctor is finished, all data for Session <span className="font-mono text-teal-300">{session?.sessionId}</span> is permanently erased.
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>No Aadhaar, name, or permanent PII requested.</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>Audio is deleted instantly after speech transcription.</span>
              </div>
            </div>

            <button
              onClick={() => setStep(4)}
              className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center space-x-2 text-base transition-all"
            >
              <span>I Agree & Start Narration</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STEP 4: Input Mode Selection & Recording */}
        {step === 4 && (
          <div className="space-y-5 animate-fadeIn">
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setInputMode('voice')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center space-x-2 transition-all ${
                  inputMode === 'voice' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>Voice Audio</span>
              </button>
              <button
                onClick={() => setInputMode('text')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center space-x-2 transition-all ${
                  inputMode === 'text' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Type className="w-4 h-4" />
                <span>Type Text</span>
              </button>
            </div>

            {inputMode === 'voice' ? (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center space-y-5">
                <p className="text-xs text-slate-300">
                  Tap microphone button below and narrate your symptoms in <strong>{selectedLang.name}</strong>.
                </p>

                <div className="py-4">
                  <button
                    onClick={handleMicToggle}
                    className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-all shadow-2xl ${
                      isRecording
                        ? 'bg-rose-600 text-white animate-mic-pulse border-4 border-rose-400'
                        : 'bg-teal-500 hover:bg-teal-400 text-slate-950 border-4 border-teal-300/40'
                    }`}
                  >
                    {isRecording ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
                  </button>
                </div>

                {isRecording ? (
                  <div className="text-rose-400 font-mono text-sm flex items-center justify-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span>Recording: 00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}</span>
                  </div>
                ) : transcript ? (
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-teal-500/30 text-left space-y-1">
                    <span className="text-[10px] text-teal-400 font-semibold uppercase">Transcribed Preview:</span>
                    <p className="text-xs text-slate-200">{transcript}</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">Tap to start recording narration (Max 60 sec)</p>
                )}
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                <label className="text-xs text-slate-300 font-medium">Type your symptoms in {selectedLang.name}:</label>
                <textarea
                  rows={4}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={`Write here in ${selectedLang.englishName}...`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>
            )}

            <button
              disabled={inputMode === 'voice' ? !transcript : !textInput}
              onClick={() => setStep(5)}
              className={`w-full font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center space-x-2 text-base transition-all ${
                (inputMode === 'voice' && transcript) || (inputMode === 'text' && textInput)
                  ? 'bg-teal-500 hover:bg-teal-400 text-slate-950'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              <span>Review Narration</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STEP 5: Transcript Review */}
        {step === 5 && (
          <div className="space-y-5 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center justify-between">
                <span>Original Narration ({selectedLang.englishName})</span>
                <span className="text-[10px] bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded font-mono">BCP-47: {selectedLang.code}</span>
              </h2>

              <textarea
                rows={4}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
              <p className="text-[11px] text-slate-400">You can edit the transcript above before sending it to AI extraction.</p>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setStep(4)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 rounded-xl text-xs flex items-center justify-center space-x-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Re-record</span>
              </button>

              <button
                onClick={handleProcessInput}
                className="flex-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg"
              >
                <Sparkles className="w-4 h-4" />
                <span>Extract Clinical Form</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: AI Extraction Loading */}
        {step === 6 && (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-5 animate-fadeIn">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-teal-500/20 border-t-teal-400 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-teal-400" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Extracting Clinical Intake...</h2>
              <p className="text-xs text-slate-400 mt-1">Gemini AI is normalizing symptoms into structured English JSON.</p>
              {isExtracting && <p className="text-[10px] text-teal-400 font-mono mt-1">Status: Extracting</p>}
              {errorMsg && <p className="text-xs text-rose-400 mt-2 font-medium">{errorMsg}</p>}
            </div>
          </div>
        )}


        {/* STEP 7: Patient Confirmation Summary */}
        {step === 7 && extractedIntake && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white">Extracted Intake Summary</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    extractedIntake.urgency.level === 'EMERGENCY'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : extractedIntake.urgency.level === 'HIGH'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  Urgency: {extractedIntake.urgency.level}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Chief Complaint:</span>
                  <span className="text-slate-200 font-medium">{extractedIntake.chief_complaint}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">Extracted Symptoms:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {extractedIntake.symptoms.map((s, idx) => (
                      <span key={idx} className="bg-teal-950/80 border border-teal-500/40 text-teal-300 px-2 py-0.5 rounded text-[11px]">
                        {s.name} ({s.duration || 'Acute'})
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">Possible Symptom Categories (Not Diagnosis):</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {extractedIntake.possible_symptom_categories.map((c, idx) => (
                      <span key={idx} className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleFinalSubmit}
              className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center space-x-2 text-base transition-all"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Send to Doctor Queue</span>
            </button>
          </div>
        )}

        {/* STEP 8: Session Completed & Token Display */}
        {step === 8 && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center space-y-5 animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs text-teal-400 font-semibold tracking-wider uppercase">Desk Queue Token</span>
              <div className="text-4xl font-extrabold text-white font-mono my-1">{session?.token || '#A-14'}</div>
              <p className="text-xs text-slate-300 mt-2">
                Your intake form has been securely transmitted to the doctor's dashboard. Please take a seat in the waiting area.
              </p>
            </div>

            <div className="bg-purple-950/40 border border-purple-500/30 p-3 rounded-xl text-xs text-purple-300 space-y-1">
              <div className="font-semibold flex items-center justify-center space-x-1">
                <Lock className="w-3.5 h-3.5" />
                <span>Ephemeral Data Purge Active</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Your session data will automatically expire and erase after consultation completion.
              </p>
            </div>

            <button
              onClick={() => {
                setStep(1);
                setSession(null);
                setTranscript('');
              }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl text-xs transition-all"
            >
              Start New Patient Intake
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
