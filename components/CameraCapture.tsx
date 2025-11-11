'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
}

export default function CameraCapture({ onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captureCount, setCaptureCount] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize camera
    async function initCamera() {
      try {
        setIsInitializing(true);
        setError(null);

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Back camera
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setStream(mediaStream);
        setIsInitializing(false);
      } catch (error) {
        console.error('Camera error:', error);
        setError('Unable to access camera. Please check permissions.');
        setIsInitializing(false);
      }
    }

    initCamera();

    return () => {
      // Cleanup camera stream on unmount
      const video = videoRef.current;
      if (video && video.srcObject) {
        const tracks = (video.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
        video.srcObject = null;
      }
    };
  }, []);

  const capturePhoto = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;
    if (isInitializing || error) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    // Convert canvas to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `product-${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });
          onCapture(file);
          setCaptureCount((prev) => prev + 1);

          // Haptic feedback (if supported)
          if ('vibrate' in navigator) {
            navigator.vibrate(50);
          }

          // Visual flash effect
          const flash = document.createElement('div');
          flash.className = 'fixed inset-0 bg-white pointer-events-none z-50';
          flash.style.animation = 'flash 0.2s ease-out';
          document.body.appendChild(flash);
          setTimeout(() => flash.remove(), 200);
        }
      },
      'image/jpeg',
      0.85
    );
  }, [onCapture, isInitializing, error]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white p-8 text-center">
        <div>
          <div className="text-6xl mb-4">📷</div>
          <h2 className="text-2xl font-bold mb-2">Camera Error</h2>
          <p className="text-gray-300">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen bg-black tap-highlight-none select-none" onClick={capturePhoto}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      {isInitializing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-white text-xl">Initializing camera...</div>
        </div>
      )}

      {/* Capture count overlay */}
      <div className="absolute top-4 right-4 bg-black/50 text-white px-4 py-2 rounded-full text-lg font-bold backdrop-blur-sm">
        {captureCount} 📸
      </div>

      {/* Capture button hint */}
      <div className="absolute bottom-0 left-0 right-0 pb-8 pt-16 bg-gradient-to-t from-black/80 to-transparent">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-3 border-4 border-white rounded-full flex items-center justify-center">
            <div className="w-16 h-16 bg-white rounded-full" />
          </div>
          <p className="text-white text-sm font-medium">Tap anywhere to capture</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes flash {
          0% {
            opacity: 0.8;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
