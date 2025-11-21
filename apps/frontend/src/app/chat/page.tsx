'use client';

import { useAuth } from '../../contexts/AuthContext';

export default function ChatPage() {
  const { user, isGuest, isAdmin } = useAuth();

  if (isGuest) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">💬</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Chat Support</h2>
        <p className="text-gray-600 mb-6">
          Create an account to access chat support with our team.
        </p>
        <button 
          onClick={() => window.location.href = '/auth'}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Account
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {isAdmin ? 'Admin Chat' : 'Chat with Support'}
        </h1>
        <p className="text-gray-600 mt-2">
          {isAdmin 
            ? 'Manage support conversations'
            : 'Get help from our support team'
          }
        </p>
      </div>

      {/* Chat Interface */}
      <div className="bg-white rounded-lg shadow-md h-96 flex flex-col">
        {/* Chat Header */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-medium">
                {isAdmin ? 'U' : 'S'}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {isAdmin ? 'User Support Queue' : 'CareForAll Support'}
              </p>
              <p className="text-sm text-green-600">● Online</p>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {/* Support Message */}
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">S</span>
              </div>
              <div className="flex-1">
                <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                  <p className="text-sm text-gray-900">
                    Hello! How can I help you today?
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-1">2:30 PM</p>
              </div>
            </div>

            {/* User placeholder message */}
            <div className="flex items-start space-x-3 justify-end">
              <div className="flex-1">
                <div className="bg-blue-600 text-white rounded-lg p-3 max-w-xs ml-auto">
                  <p className="text-sm">
                    I have a question about my donation.
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-1 text-right">2:31 PM</p>
              </div>
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Support response */}
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">S</span>
              </div>
              <div className="flex-1">
                <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                  <p className="text-sm text-gray-900">
                    I'd be happy to help! What specific question do you have about your donation?
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-1">2:32 PM</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled
            />
            <button 
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              disabled
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-6xl mb-4">🚧</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Coming Soon</h2>
        <p className="text-gray-600 mb-6">
          Real-time chat functionality is being developed. Features will include:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Real-time messaging</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>File and image sharing</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Chat history and transcripts</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Priority support for donors</span>
          </div>
        </div>
      </div>
    </div>
  );
}
