
import React, { useRef, useState, useEffect } from 'react';
import { analyzeMetalFromImage } from '../services/geminiService';
import { MetalAnalysis } from '../types';

interface CameraScannerProps {
  onAnalysisComplete: (result: MetalAnalysis) => void;
}

const CameraScanner: React.FC<CameraScannerProps> = ({ onAnalysisComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err) {
      setError("Unable to access camera. Please check permissions.");
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setLoading(true);
    setError(null);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const base64 = dataUrl.split(',')[1];

      try {
        const result = await analyzeMetalFromImage(base64);
        onAnalysisComplete(result);
      } catch (err) {
        setError("AI Analysis failed. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative w-full aspect-square max-w-sm rounded-2xl overflow-hidden border-4 border-gray-800 neon-border">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 p-4 text-center text-red-400">
            {error}
          </div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Scanning Animation Overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
           <div className="w-full h-1 bg-cyan-400 opacity-50 absolute animate-[scan_2s_linear_infinite]" style={{
             boxShadow: '0 0 15px #22d3ee'
           }}></div>
        </div>

        {loading && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400 mb-4"></div>
            <p className="text-cyan-400 font-mono animate-pulse">ANALYZING MOLECULAR STRUCTURE...</p>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <button
        onClick={captureAndAnalyze}
        disabled={loading || !!error}
        className="mt-6 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white px-8 py-4 rounded-full font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2"
      >
        <i className="fas fa-microchip"></i>
        {loading ? 'PROCESSING...' : 'ANALYZE OBJECT'}
      </button>

      <style>{`
        @keyframes scan {
          0% { top: 0%; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
};

export default CameraScanner;
