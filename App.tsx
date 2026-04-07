
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppMode, SensorData, MetalAnalysis } from './types';
import DetectorGauge from './components/DetectorGauge';
import HistoryChart from './components/HistoryChart';
import CameraScanner from './components/CameraScanner';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.DETECTOR);
  const [sensorData, setSensorData] = useState<SensorData>({ x: 0, y: 0, z: 0, total: 0, timestamp: Date.now() });
  const [history, setHistory] = useState<SensorData[]>([]);
  const [analysisResult, setAnalysisResult] = useState<MetalAnalysis | null>(null);
  const [hasSensor, setHasSensor] = useState<boolean | null>(null);
  
  // Calibration State
  const [isCalibrating, setIsCalibrating] = useState(true);
  const [calibrationStep, setCalibrationStep] = useState<'intro' | 'measuring' | 'complete'>('intro');
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [baseline, setBaseline] = useState(0);
  const calibrationBuffer = useRef<number[]>([]);
  
  const audioCtx = useRef<AudioContext | null>(null);
  const oscillator = useRef<OscillatorNode | null>(null);
  const gainNode = useRef<GainNode | null>(null);

  // Initialize Audio for detection feedback
  const initAudio = () => {
    if (audioCtx.current) return;
    audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    oscillator.current = audioCtx.current.createOscillator();
    gainNode.current = audioCtx.current.createGain();
    
    oscillator.current.type = 'sine';
    oscillator.current.frequency.setValueAtTime(440, audioCtx.current.currentTime);
    gainNode.current.gain.setValueAtTime(0, audioCtx.current.currentTime);
    
    oscillator.current.connect(gainNode.current);
    gainNode.current.connect(audioCtx.current.destination);
    oscillator.current.start();
  };

  const updateAudioFeedback = (intensity: number) => {
    if (!audioCtx.current || !oscillator.current || !gainNode.current) return;
    
    // Intensity relative to baseline. If baseline is 50, and current is 100, delta is 50.
    const delta = Math.max(0, intensity - (baseline || 45));
    const freq = Math.min(1500, 440 + delta * 8);
    const volume = Math.min(0.2, delta / 150);
    
    const now = audioCtx.current.currentTime;
    oscillator.current.frequency.setTargetAtTime(Math.max(440, freq), now, 0.1);
    gainNode.current.gain.setTargetAtTime(delta > 15 ? volume : 0, now, 0.1);
  };

  const startMeasuring = () => {
    setCalibrationStep('measuring');
    calibrationBuffer.current = [];
    setCalibrationProgress(0);
  };

  // Sensor Logic
  useEffect(() => {
    let sensor: any = null;

    const handleReading = (x: number, y: number, z: number) => {
      const total = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
      const newData = { x, y, z, total, timestamp: Date.now() };
      
      setSensorData(newData);
      setHistory(prev => [...prev.slice(-49), newData]);
      
      if (calibrationStep === 'measuring') {
        calibrationBuffer.current.push(total);
        const progress = Math.min(100, (calibrationBuffer.current.length / 60) * 100);
        setCalibrationProgress(progress);
        
        if (calibrationBuffer.current.length >= 60) {
          const avg = calibrationBuffer.current.reduce((a, b) => a + b, 0) / calibrationBuffer.current.length;
          setBaseline(avg);
          setCalibrationStep('complete');
          setTimeout(() => setIsCalibrating(false), 1500);
        }
      } else if (!isCalibrating) {
        updateAudioFeedback(total);
      }
    };

    if ('Magnetometer' in window) {
      try {
        // @ts-ignore
        sensor = new Magnetometer({ frequency: 60 });
        sensor.addEventListener('reading', () => handleReading(sensor.x, sensor.y, sensor.z));
        sensor.addEventListener('error', () => setHasSensor(false));
        sensor.start();
        setHasSensor(true);
      } catch (e) {
        setHasSensor(false);
      }
    } else {
      setHasSensor(false);
      const interval = setInterval(() => {
        handleReading(0, 0, 0 + (Math.random() * 5 + 45));
      }, 100);
      return () => clearInterval(interval);
    }

    return () => {
      if (sensor) sensor.stop();
    };
  }, [calibrationStep, isCalibrating]);

  const handleAnalysis = (result: MetalAnalysis) => {
    setAnalysisResult(result);
  };

  const toggleCalibration = () => {
    setCalibrationStep('intro');
    setIsCalibrating(true);
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto relative bg-[#0a0a0a] shadow-2xl">
      {/* Header */}
      <header className="p-6 pt-10 flex items-center justify-between border-b border-gray-800 bg-gray-900/40 backdrop-blur-md sticky top-0 z-50">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-white flex items-center gap-2">
            <i className="fas fa-magnet text-cyan-400"></i>
            FERRO<span className="text-cyan-400">SCAN</span> AI
          </h1>
          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Advanced Detection Suite v3.1</p>
        </div>
        <div className="flex gap-2">
          <div className={`w-3 h-3 rounded-full ${hasSensor ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-amber-500 shadow-[0_0_10px_#f59e0b]'}`}></div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-24 p-6">
        {mode === AppMode.DETECTOR && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gray-900/50 p-6 rounded-3xl border border-gray-800 shadow-xl relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <button 
                  onClick={toggleCalibration}
                  className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-400 px-3 py-1 rounded-full border border-gray-700 transition-colors uppercase font-bold"
                >
                  <i className="fas fa-sync-alt mr-1"></i> Recalibrate
                </button>
              </div>
              
              <DetectorGauge value={sensorData.total} max={baseline + 200 || 250} />
              
              <div className="text-center mt-4">
                <span className="text-5xl font-black font-mono text-white">
                  {sensorData.total.toFixed(1)}
                </span>
                <span className="text-cyan-400 font-mono ml-2 text-xl">μT</span>
                <div className="text-[10px] text-gray-500 font-mono mt-1">
                  BASELINE: {baseline.toFixed(1)} μT | DELTA: {Math.max(0, sensorData.total - baseline).toFixed(1)}
                </div>
              </div>

              {!hasSensor && (
                <div className="mt-4 p-3 bg-amber-900/20 border border-amber-800/50 rounded-xl text-amber-200 text-xs text-center flex items-center gap-2">
                  <i className="fas fa-exclamation-triangle"></i>
                  <span>No Magnetometer. Simulator active.</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 mt-8">
                {['x', 'y', 'z'].map((axis) => (
                  <div key={axis} className="bg-black/40 p-3 rounded-xl border border-gray-800 text-center">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">{axis}-axis</div>
                    <div className="text-sm font-mono text-gray-300">{(sensorData as any)[axis].toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Flux History</h3>
              <HistoryChart data={history} />
            </div>

            <div className="p-4 bg-cyan-900/10 border border-cyan-800/30 rounded-2xl flex items-center gap-4">
              <button 
                onClick={initAudio}
                className="w-12 h-12 rounded-full bg-cyan-600 flex items-center justify-center text-white shrink-0 shadow-lg active:scale-90 transition-transform"
              >
                <i className="fas fa-volume-up"></i>
              </button>
              <div>
                <h4 className="text-sm font-bold text-cyan-100">Audio Feedback</h4>
                <p className="text-[10px] text-cyan-400">Sonic pitch increases with magnetic density. Tap to start.</p>
              </div>
            </div>
          </div>
        )}

        {mode === AppMode.SCANNER && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {!analysisResult ? (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-white mb-2">Visual AI Scanner</h2>
                  <p className="text-sm text-gray-400">Identify material composition using Gemini AI.</p>
                </div>
                <CameraScanner onAnalysisComplete={handleAnalysis} />
              </div>
            ) : (
              <div className="space-y-6 pb-4">
                <div className="flex items-center justify-between">
                  <button onClick={() => setAnalysisResult(null)} className="text-cyan-400 text-sm flex items-center gap-2">
                    <i className="fas fa-arrow-left"></i> New Scan
                  </button>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${analysisResult.detected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {analysisResult.detected ? 'METAL DETECTED' : 'NO METAL FOUND'}
                  </span>
                </div>
                <div className="bg-gray-900/50 rounded-3xl border border-gray-800 p-6 space-y-6">
                  <div>
                    <h2 className="text-3xl font-black text-white">{analysisResult.type}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500" style={{ width: `${analysisResult.confidence * 100}%` }}></div>
                      </div>
                      <span className="text-xs font-mono text-cyan-400">{(analysisResult.confidence * 100).toFixed(0)}% CONFIDENCE</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Material Characteristics</h3>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.properties.map((prop, i) => (
                        <span key={i} className="px-3 py-1.5 bg-gray-800 rounded-lg text-xs text-gray-300 border border-gray-700">
                          {prop}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 bg-black/40 rounded-2xl border border-gray-800">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Technical Summary</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{analysisResult.description}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === AppMode.HISTORY && (
          <div className="flex flex-col items-center justify-center h-96 text-center space-y-4 text-gray-500 animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center text-2xl mb-2">
              <i className="fas fa-database opacity-20"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-400">Scan History</h3>
            <p className="text-sm max-w-[200px]">Archived scan data will appear here in future updates.</p>
          </div>
        )}
      </main>

      {/* Persistent Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-xl border-t border-gray-800 p-4 pb-8 flex justify-around max-w-md mx-auto z-50">
        <button onClick={() => setMode(AppMode.DETECTOR)} className={`flex flex-col items-center gap-1 transition-colors ${mode === AppMode.DETECTOR ? 'text-cyan-400' : 'text-gray-500'}`}>
          <i className="fas fa-compass text-xl"></i>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Detector</span>
        </button>
        <button onClick={() => setMode(AppMode.SCANNER)} className={`flex flex-col items-center gap-1 transition-colors ${mode === AppMode.SCANNER ? 'text-cyan-400' : 'text-gray-500'}`}>
          <div className="relative">
            <i className="fas fa-expand text-xl"></i>
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-gray-900"></div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tighter">AI Scanner</span>
        </button>
        <button onClick={() => setMode(AppMode.HISTORY)} className={`flex flex-col items-center gap-1 transition-colors ${mode === AppMode.HISTORY ? 'text-cyan-400' : 'text-gray-500'}`}>
          <i className="fas fa-list-ul text-xl"></i>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Archive</span>
        </button>
      </nav>

      {/* Calibration Wizard */}
      {isCalibrating && (
        <div className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
          <div className="w-32 h-32 mb-8 relative">
            <div className={`absolute inset-0 border-4 border-cyan-400/20 rounded-full ${calibrationStep === 'measuring' ? 'animate-pulse' : ''}`}></div>
            {calibrationStep === 'measuring' && (
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="64" cy="64" r="60"
                  fill="transparent"
                  stroke="#22d3ee"
                  strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 60}`}
                  strokeDashoffset={`${2 * Math.PI * 60 * (1 - calibrationProgress / 100)}`}
                  className="transition-all duration-100 ease-linear"
                />
              </svg>
            )}
            <i className={`fas ${calibrationStep === 'complete' ? 'fa-check-circle text-green-500' : 'fa-magnet text-cyan-400'} absolute inset-0 flex items-center justify-center text-5xl transition-all duration-500`}></i>
          </div>

          <div className="space-y-4 max-w-xs">
            {calibrationStep === 'intro' && (
              <>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Sensor Calibration</h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                  To ensure accurate metal detection, we need to establish the environmental magnetic baseline.
                </p>
                <div className="p-4 bg-gray-900 rounded-2xl border border-gray-800 flex items-start gap-3 text-left">
                  <i className="fas fa-info-circle text-cyan-400 mt-1"></i>
                  <p className="text-[11px] text-gray-500">Hold your device away from all metal objects and electronic devices during this process.</p>
                </div>
                <button 
                  onClick={startMeasuring}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-cyan-900/20 active:scale-95 transition-all mt-4"
                >
                  START CALIBRATION
                </button>
              </>
            )}

            {calibrationStep === 'measuring' && (
              <>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter animate-pulse">Establishing Baseline</h2>
                <p className="text-sm text-gray-400">HOLD STEADY. RECORDING ENVIRONMENTAL FLUX...</p>
                <div className="text-4xl font-mono text-cyan-400 mt-4">{Math.round(calibrationProgress)}%</div>
                <div className="text-[10px] text-gray-600 font-mono mt-2 italic">Current: {sensorData.total.toFixed(2)} μT</div>
              </>
            )}

            {calibrationStep === 'complete' && (
              <>
                <h2 className="text-3xl font-black text-green-400 uppercase tracking-tighter">Ready!</h2>
                <p className="text-sm text-gray-400">Environmental baseline established at {baseline.toFixed(1)} μT.</p>
                <div className="mt-4 flex justify-center">
                   <div className="w-8 h-8 rounded-full border-2 border-green-500 border-t-transparent animate-spin"></div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
