'use client';

import { FC } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { IconDeviceMobile, IconBrandApple, IconBrandAndroid, IconCheck, IconExternalLink } from '@tabler/icons-react';

export const MobileAppSection: FC = () => {
  const installUrl = 'https://ai.msf.org';

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-6 text-black dark:text-white flex items-center">
        <IconDeviceMobile className="mr-2" size={24} />
        Mobile App
      </h2>

      <div className="space-y-6">
        {/* QR Code Section */}
        <div className="flex flex-col items-center p-6 bg-gray-50 dark:bg-[#212121] rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">
            Scan to Install
          </h3>
          <div className="bg-white p-4 rounded-lg">
            <QRCodeSVG value={installUrl} size={200} level="H" />
          </div>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
            Scan this QR code with your mobile device to start the install process
          </p>
        </div>

        {/* Benefits Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <h3 className="text-sm font-bold mb-3 text-black dark:text-white">
            Why Install?
          </h3>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start">
              <IconCheck className="mr-2 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" size={16} />
              <span>Access the app directly from your home screen</span>
            </li>
            <li className="flex items-start">
              <IconCheck className="mr-2 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" size={16} />
              <span>Works offline with cached conversations</span>
            </li>
            <li className="flex items-start">
              <IconCheck className="mr-2 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" size={16} />
              <span>Faster loading and better performance</span>
            </li>
            <li className="flex items-start">
              <IconCheck className="mr-2 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" size={16} />
              <span>Native app-like experience</span>
            </li>
          </ul>
        </div>

        {/* iOS Instructions */}
        <div className="bg-white dark:bg-[#212121] rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-3">
            <IconBrandApple className="mr-2 text-gray-700 dark:text-gray-300" size={24} />
            <h3 className="text-sm font-bold text-black dark:text-white">
              iOS (iPhone/iPad)
            </h3>
          </div>
          <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
            <p className="text-xs text-amber-800 dark:text-amber-200 font-semibold">
              ⚠️ Important: You must use Safari browser. Other browsers like Chrome or Firefox will not work for installation on iOS.
            </p>
          </div>
          <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300 list-decimal list-inside">
            <li><strong>Open this page in Safari</strong> (not Chrome or other browsers)</li>
            <li>Tap the <strong>Share</strong> button (square with arrow)</li>
            <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
            <li>Tap <strong>Add</strong> to confirm</li>
          </ol>
        </div>

        {/* Android Instructions */}
        <div className="bg-white dark:bg-[#212121] rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-3">
            <IconBrandAndroid className="mr-2 text-gray-700 dark:text-gray-300" size={24} />
            <h3 className="text-sm font-bold text-black dark:text-white">
              Android
            </h3>
          </div>
          <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300 list-decimal list-inside">
            <li>Open this page in Chrome</li>
            <li>Tap the <strong>Menu</strong> (three dots)</li>
            <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong></li>
            <li>Tap <strong>Install</strong> to confirm</li>
          </ol>
        </div>

        {/* Note & PWA Info Link */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 italic">
            Note: This installs the web app as a Progressive Web App (PWA) on your device. No app store required!
          </div>
          <a
            href="https://web.dev/what-are-pwas/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            <IconExternalLink size={14} className="mr-1" />
            Learn more about Progressive Web Apps
          </a>
        </div>
      </div>
    </div>
  );
};
