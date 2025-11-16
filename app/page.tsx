import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-indigo-500 to-purple-600">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Deal Hunter
          </h1>
          <p className="text-gray-600">
            Find & Share the Best Deals
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/capture"
            className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-xl text-center transition-colors shadow-lg"
          >
            📸 Capture Products
          </Link>

          <Link
            href="/dashboard"
            className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-xl text-center transition-colors shadow-lg"
          >
            📋 Curate Deals
          </Link>

          <Link
            href="/generate"
            className="block w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-4 px-6 rounded-xl text-center transition-colors shadow-lg"
          >
            ✨ Generate Posts
          </Link>

          <Link
            href="/deals"
            className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-xl text-center transition-colors shadow-lg"
          >
            🎯 Track Deals
          </Link>

          <Link
            href="/admin/examples"
            className="block w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-4 px-6 rounded-xl text-center transition-colors shadow-lg"
          >
            ⚙️ Manage Examples
          </Link>
        </div>

        <div className="text-center text-sm text-gray-500 pt-4">
          <p>Powered by Turso + Vercel + Claude AI</p>
        </div>
      </div>
    </div>
  );
}
