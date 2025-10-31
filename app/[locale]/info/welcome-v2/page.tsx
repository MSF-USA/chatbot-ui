import {
  IconArrowLeft,
  IconPalette,
  IconRocket,
  IconShield,
  IconSparkles,
  IconWorld,
} from '@tabler/icons-react';

import Link from 'next/link';

import { AzureAIIcon, AzureOpenAIIcon } from '@/components/Icons/providers';

export default function WelcomeV2Page() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-20">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
      >
        <IconArrowLeft size={16} />
        Back to Chat
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <IconSparkles
            size={32}
            className="text-blue-600 dark:text-blue-400"
          />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome to AI Assistant V2
          </h1>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          A major upgrade with new features, improved performance, and better
          privacy controls
        </p>
      </div>

      {/* What's New Overview */}
      <div className="mb-12 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          What's New in V2?
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          A complete redesign with powerful new features for customization,
          better mobile experience, and smarter AI capabilities.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="flex items-start gap-2">
            <IconSparkles
              size={20}
              className="text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0"
            />
            <div>
              <div className="font-medium text-gray-900 dark:text-white text-sm">
                Quick Actions
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Prompts & Tones with AI assist
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <IconWorld
              size={20}
              className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
            />
            <div>
              <div className="font-medium text-gray-900 dark:text-white text-sm">
                Web Search
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Privacy-focused & faster modes
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <IconRocket
              size={20}
              className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0"
            />
            <div>
              <div className="font-medium text-gray-900 dark:text-white text-sm">
                Mobile PWA
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Install as native app
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature 1: Quick Actions (Prompts & Tones) */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <IconSparkles
            size={28}
            className="text-purple-600 dark:text-purple-400"
          />
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Quick Actions: Prompts & Tones
          </h2>
          <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded">
            NEW
          </span>
        </div>

        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">
            What is it?
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            Access your custom prompts and tones instantly by typing{' '}
            <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
              /
            </span>{' '}
            in the chat. Create, organize, and manage your favorite prompts with
            folders and AI-powered suggestions.
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
              <IconSparkles
                size={18}
                className="text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0"
              />
              <div>
                <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                  Saved Prompts with AI Assist
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Save your frequently used prompts, organize them in folders,
                  and let AI help you refine them. Quick access via{' '}
                  <span className="font-mono">/</span> in chat.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
              <IconPalette
                size={18}
                className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
              />
              <div>
                <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                  Writing Tones
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Define custom writing styles and voice guidelines. Apply tones
                  to your messages for consistent communication. Use AI to
                  analyze and suggest tone improvements.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
              <IconSparkles
                size={18}
                className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0"
              />
              <div>
                <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                  AI-Powered Generation
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Both prompts and tones feature AI assistance to help you
                  create, refine, and improve your content with smart
                  suggestions.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature 2: Web Search Mode */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <IconWorld size={28} className="text-blue-600 dark:text-blue-400" />
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Web Search Mode
          </h2>
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded">
            ON by default
          </span>
        </div>

        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">
            What is it?
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            Give AI access to web search for up-to-date information. Choose
            between privacy-focused routing or faster Azure AI Foundry Mode.
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
              <IconShield
                size={18}
                className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0"
              />
              <div>
                <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                  Privacy-Focused (Default)
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Only search queries sent to Azure AI Foundry, not your full
                  conversation. Maximum privacy, slightly slower.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
              <AzureAIIcon className="w-[18px] h-[18px] mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                  Azure AI Foundry Mode (GPT-4.1 only)
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Full conversation sent for faster processing with complete
                  context. Better performance, less private.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Link
              href="/info/search-mode"
              className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Learn more about Search Mode with data flow diagrams →
            </Link>
          </div>
        </div>
      </div>

      {/* Feature 3: Progressive Web App (PWA) */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <IconRocket
            size={28}
            className="text-green-600 dark:text-green-400"
          />
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Install as Mobile App
          </h2>
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded">
            PWA
          </span>
        </div>

        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">
            What is it?
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            AI Assistant is now a Progressive Web App (PWA). Install it on your
            phone or tablet for a native app experience without needing an app
            store.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
              <span className="text-green-600 dark:text-green-400 mt-0.5">
                ✓
              </span>
              <div className="text-xs">
                <div className="font-medium text-gray-900 dark:text-white mb-0.5">
                  Home Screen Access
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Launch directly from your device's home screen
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
              <span className="text-green-600 dark:text-green-400 mt-0.5">
                ✓
              </span>
              <div className="text-xs">
                <div className="font-medium text-gray-900 dark:text-white mb-0.5">
                  Offline Support
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Access cached conversations without internet
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
              <span className="text-green-600 dark:text-green-400 mt-0.5">
                ✓
              </span>
              <div className="text-xs">
                <div className="font-medium text-gray-900 dark:text-white mb-0.5">
                  Faster Loading
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Better performance with cached resources
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
              <span className="text-green-600 dark:text-green-400 mt-0.5">
                ✓
              </span>
              <div className="text-xs">
                <div className="font-medium text-gray-900 dark:text-white mb-0.5">
                  Native Feel
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Full-screen app-like experience on mobile
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Check Settings → Mobile App for QR code and installation
              instructions for iOS and Android.
            </p>
          </div>
        </div>
      </div>

      {/* Feature 4: Enhanced Transcription */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <IconPalette
            size={28}
            className="text-orange-600 dark:text-orange-400"
          />
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Improved Audio/Video Transcription
          </h2>
        </div>

        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">
            What's new?
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            Transcription viewer now includes powerful tools to work with your
            audio and video transcripts.
          </p>

          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-orange-600 dark:text-orange-400 mt-0.5">
                •
              </span>
              <span>
                <strong>Copy to clipboard:</strong> Quick one-click copy of
                entire transcript
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 dark:text-orange-400 mt-0.5">
                •
              </span>
              <span>
                <strong>Download as text:</strong> Save transcripts as .txt
                files for offline use
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 dark:text-orange-400 mt-0.5">
                •
              </span>
              <span>
                <strong>Translate transcripts:</strong> Convert transcriptions
                to 13+ languages including Spanish, French, German, Arabic,
                Chinese, Japanese, and more
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 dark:text-orange-400 mt-0.5">
                •
              </span>
              <span>
                <strong>Better formatting:</strong> Transcripts are
                automatically formatted with proper line breaks at sentence
                boundaries
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Feature 5: Improved Mobile Experience */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <IconPalette
            size={28}
            className="text-purple-600 dark:text-purple-400"
          />
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Better Mobile & UI/UX
          </h2>
        </div>

        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">
            What's improved?
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-white dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
              <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                Mobile-First Design
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Optimized mobile navigation, touch-friendly controls, and
                responsive layouts
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
              <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                Cleaner Interface
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Streamlined controls, better visual hierarchy, and reduced
                clutter
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
              <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                Provider Icons
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                Colorful icons for each AI provider (OpenAI, DeepSeek, xAI,
                Azure)
              </div>
              <div className="flex items-center gap-2">
                <AzureOpenAIIcon className="w-3 h-3" />
                <AzureAIIcon className="w-3 h-3" />
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
              <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                Settings Redesign
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Organized into clear sections with better mobile navigation
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Getting Started */}
      <div className="mb-12 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Getting Started with V2
        </h2>
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 font-bold">
              1.
            </span>
            <div>
              <strong>Try Quick Actions:</strong> Type{' '}
              <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                /
              </span>{' '}
              in the chat to access prompts. Create your first custom prompt or
              tone.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 font-bold">
              2.
            </span>
            <div>
              <strong>Install on mobile:</strong> Go to Settings → Mobile App to
              get the QR code and install AI Assistant as a Progressive Web App
              on your phone.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 font-bold">
              3.
            </span>
            <div>
              <strong>Explore search modes:</strong> Check out the{' '}
              <Link
                href="/info/search-mode"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Search Mode guide
              </Link>{' '}
              to understand privacy-focused vs. Azure AI Foundry routing.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 font-bold">
              4.
            </span>
            <div>
              <strong>Upload audio/video:</strong> Try the improved
              transcription with translation support for multilingual content.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 font-bold">
              5.
            </span>
            <div>
              <strong>Your data is safe:</strong> All existing conversations
              have been migrated automatically. Nothing was lost in the upgrade.
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-6">
        <p className="mb-2 font-medium text-gray-900 dark:text-white">
          Welcome to AI Assistant V2!
        </p>
        <p className="mb-4">
          A complete redesign focused on customization, transparency, and mobile
          experience.
        </p>
        <div className="flex items-center justify-center gap-4 text-xs">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Start Chatting
          </Link>
          <span className="text-gray-400">•</span>
          <Link
            href="/info/search-mode"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Search Mode Guide
          </Link>
        </div>
      </div>
    </div>
  );
}
