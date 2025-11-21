'use client';

import { useAuth } from '../../contexts/AuthContext';

export default function CampaignsPage() {
  const { user, isGuest, hasAdminAccess } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {isGuest ? 'Support a Cause' : hasAdminAccess ? 'All Campaigns' : 'Running Campaigns'}
        </h1>
        <p className="text-gray-600 mt-2">
          {isGuest 
            ? 'Make an anonymous donation to help change lives'
            : hasAdminAccess 
            ? 'Overview of all campaigns on the platform'
            : 'Active campaigns you can support'
          }
        </p>
      </div>

      {/* Featured Campaign */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold mb-2">🌍 Clean Water for All</h2>
            <p className="text-blue-100 mb-4">Help provide clean drinking water to communities in need</p>
            <div className="flex items-center space-x-4">
              <div>
                <p className="text-sm text-blue-100">Raised</p>
                <p className="text-xl font-bold">$127,500</p>
              </div>
              <div>
                <p className="text-sm text-blue-100">Goal</p>
                <p className="text-xl font-bold">$150,000</p>
              </div>
              <div>
                <p className="text-sm text-blue-100">Progress</p>
                <p className="text-xl font-bold">85%</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              {isGuest ? 'Donate Anonymously' : 'Support This Cause'}
            </button>
          </div>
        </div>
        <div className="mt-4 bg-white bg-opacity-20 rounded-full h-2">
          <div className="bg-white h-2 rounded-full" style={{ width: '85%' }}></div>
        </div>
      </div>

      {/* Campaign Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Campaign 1 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="h-48 bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
            <span className="text-6xl">🏥</span>
          </div>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Medical Aid Fund</h3>
            <p className="text-gray-600 text-sm mb-4">Emergency medical support for families in crisis</p>
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm text-gray-500">Raised</p>
                <p className="font-bold text-gray-900">$45,200</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Goal</p>
                <p className="font-bold text-gray-900">$75,000</p>
              </div>
            </div>
            <div className="bg-gray-200 rounded-full h-2 mb-4">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '60%' }}></div>
            </div>
            <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors">
              {isGuest ? 'Donate' : 'Support'}
            </button>
          </div>
        </div>

        {/* Campaign 2 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="h-48 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
            <span className="text-6xl">📚</span>
          </div>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Education for All</h3>
            <p className="text-gray-600 text-sm mb-4">Providing educational resources to underprivileged children</p>
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm text-gray-500">Raised</p>
                <p className="font-bold text-gray-900">$28,900</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Goal</p>
                <p className="font-bold text-gray-900">$50,000</p>
              </div>
            </div>
            <div className="bg-gray-200 rounded-full h-2 mb-4">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: '58%' }}></div>
            </div>
            <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
              {isGuest ? 'Donate' : 'Support'}
            </button>
          </div>
        </div>

        {/* Campaign 3 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="h-48 bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
            <span className="text-6xl">🍽️</span>
          </div>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Feed the Hungry</h3>
            <p className="text-gray-600 text-sm mb-4">Providing meals to homeless and food-insecure families</p>
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm text-gray-500">Raised</p>
                <p className="font-bold text-gray-900">$67,800</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Goal</p>
                <p className="font-bold text-gray-900">$80,000</p>
              </div>
            </div>
            <div className="bg-gray-200 rounded-full h-2 mb-4">
              <div className="bg-purple-500 h-2 rounded-full" style={{ width: '85%' }}></div>
            </div>
            <button className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors">
              {isGuest ? 'Donate' : 'Support'}
            </button>
          </div>
        </div>
      </div>

      {/* Guest User Notice */}
      {isGuest && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <span className="text-orange-500 text-2xl">💡</span>
            <div>
              <h3 className="text-lg font-semibold text-orange-900">Anonymous Donations</h3>
              <p className="text-orange-800 mt-2">
                As a guest, you can donate anonymously to any campaign. During payment, you can provide 
                your email address to receive receipts and track your donation impact.
              </p>
              <div className="mt-4 flex space-x-3">
                <button 
                  onClick={() => window.location.href = '/auth'}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700 transition-colors"
                >
                  Create Account for Full Features
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Coming Soon */}
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-6xl mb-4">🚧</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">More Features Coming Soon</h2>
        <p className="text-gray-600 mb-6">
          Enhanced campaign features are being developed:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Secure payment processing</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Campaign updates and messages</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Donation tracking and receipts</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Social sharing features</span>
          </div>
        </div>
      </div>
    </div>
  );
}
