import { Link } from 'react-router-dom';
import { Calendar, MapPin, Smartphone } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="w-20 h-20 bg-primary-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
          <span className="text-4xl font-bold text-white">B</span>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          Nick's Vegas Bachelor Party
        </h1>

        <div className="mt-4 flex flex-col gap-2 text-gray-600 dark:text-gray-400">
          <div className="flex items-center justify-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">April 3 - 5, 2026</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">Las Vegas, NV</span>
          </div>
        </div>

        <div className="mt-10 w-full max-w-xs flex flex-col gap-3">
          <Link to="/register" className="btn-primary w-full h-12 text-base">
            Create Account
          </Link>
          <Link to="/login" className="btn-secondary w-full h-12 text-base">
            Sign In
          </Link>
        </div>
      </div>

      {/* Install instructions */}
      <div className="px-6 pb-10">
        <div className="card max-w-sm mx-auto p-5">
          <div className="flex items-center gap-3 mb-3">
            <Smartphone className="w-5 h-5 text-primary-600" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Install the App</h2>
          </div>
          <div className="space-y-3 text-xs text-gray-600 dark:text-gray-400">
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-200">iPhone (Safari)</p>
              <p>Tap Share &rarr; "Add to Home Screen"</p>
            </div>
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-200">Android (Chrome)</p>
              <p>Tap Menu &rarr; "Install app"</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
