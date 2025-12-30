import { useState } from 'react';
import { X, Download, Share } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export function InstallPrompt() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if already installed, dismissed, or not installable
  if (isInstalled || dismissed) {
    return null;
  }

  // Show iOS-specific instructions
  if (isIOS && !isInstallable) {
    return (
      <div className="fixed bottom-20 left-4 right-4 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-40 max-w-lg mx-auto">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Share className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Install BachBoys</h3>
            <p className="text-sm text-gray-600 mt-1">
              Tap the <span className="inline-flex items-center"><Share className="w-4 h-4 mx-1" /></span>
              share button, then "Add to Home Screen" for the best experience.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show install button for Android/Desktop
  if (!isInstallable) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-40 max-w-lg mx-auto">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary-100 rounded-lg">
          <Download className="w-6 h-6 text-primary-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Install BachBoys</h3>
          <p className="text-sm text-gray-600">Add to your home screen for quick access</p>
        </div>
        <button
          onClick={install}
          className="btn-primary px-4 py-2 text-sm"
        >
          Install
        </button>
      </div>
    </div>
  );
}
