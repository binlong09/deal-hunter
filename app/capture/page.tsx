'use client';

import { useState, useEffect } from 'react';
import CameraCapture from '@/components/CameraCapture';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Category = 'supplements' | 'baby' | 'cosmetics';

export default function CapturePage() {
  const [category, setCategory] = useState<Category>('supplements');
  const [tripId, setTripId] = useState<string | null>(null);
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const router = useRouter();

  // Create trip on mount
  useEffect(() => {
    async function createTrip() {
      try {
        const response = await fetch('/api/trips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ store: 'costco' }),
        });
        const data = await response.json();
        setTripId(data.id.toString());
      } catch (error) {
        console.error('Failed to create trip:', error);
      }
    }
    createTrip();
  }, []);

  const handleCapture = async (file: File) => {
    if (!tripId) return;

    // Add to upload queue
    setUploadQueue((prev) => [...prev, file]);

    // Upload in background
    uploadImage(file);
  };

  const uploadImage = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('tripId', tripId!);
      formData.append('category', category);

      await fetch('/api/products/upload', {
        method: 'POST',
        body: formData,
      });

      // Remove from queue and increment count
      setUploadQueue((prev) => prev.filter((f) => f !== file));
      setUploadedCount((prev) => prev + 1);
    } catch (error) {
      console.error('Upload failed:', error);
      // Keep in queue - could retry later
    }
  };

  if (!tripId) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-xl">Initializing...</div>
      </div>
    );
  }

  if (!showCamera) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">📸</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Capture Products
            </h1>
            <p className="text-gray-600">
              Select a category and start capturing
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="supplements">💊 Supplements</option>
                <option value="baby">👶 Baby Products</option>
                <option value="cosmetics">💄 Cosmetics</option>
              </select>
            </div>

            <button
              onClick={() => setShowCamera(true)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors shadow-lg"
            >
              Start Camera
            </button>

            <Link
              href="/"
              className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-4 px-6 rounded-xl text-center transition-colors"
            >
              Back to Home
            </Link>
          </div>

          {uploadedCount > 0 && (
            <div className="text-center text-sm text-gray-600 pt-4 border-t">
              <p className="font-medium">Trip #{tripId}</p>
              <p>{uploadedCount} photos captured</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Upload status overlay */}
      {uploadQueue.length > 0 && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg">
          Uploading {uploadQueue.length}...
        </div>
      )}

      {/* Back button */}
      <button
        onClick={() => setShowCamera(false)}
        className="fixed top-20 left-4 z-50 bg-black/50 text-white px-4 py-2 rounded-full backdrop-blur-sm hover:bg-black/70"
      >
        ← Back
      </button>

      {/* Done button */}
      <button
        onClick={() => router.push('/dashboard')}
        className="fixed top-20 right-20 z-50 bg-green-600/90 text-white px-6 py-2 rounded-full backdrop-blur-sm hover:bg-green-700 font-semibold"
      >
        Done ({uploadedCount})
      </button>

      <CameraCapture onCapture={handleCapture} category={category} />
    </>
  );
}
