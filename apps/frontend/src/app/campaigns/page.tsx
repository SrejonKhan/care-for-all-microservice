'use client';

import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { campaignService, Campaign } from '../../lib/campaign';

export default function CampaignsPage() {
  const { user, isGuest, hasAdminAccess } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await campaignService.listCampaigns({
        status: 'ACTIVE',
        pageSize: 20
      });

      if (response.success && response.data) {
        setCampaigns(response.data.campaigns);
      } else {
        // Show mock data while API is being debugged
        console.warn('API failed, showing mock data:', response.error?.message);
        setMockCampaigns();
      }
    } catch (err) {
      console.warn('Network error, showing mock data:', err);
      setMockCampaigns();
    } finally {
      setLoading(false);
    }
  };

  const setMockCampaigns = () => {
    const mockData: Campaign[] = [
      {
        id: '1',
        title: 'Emergency Medical Fund for Children',
        description: 'Help provide life-saving medical treatment for children in urgent need. Every donation makes a difference in saving young lives and giving families hope during their most challenging times.',
        goalAmount: 50000,
        currentAmount: 32750,
        status: 'ACTIVE' as const,
        ownerId: 'admin',
        startDate: '2025-11-01T00:00:00.000Z',
        endDate: '2025-12-31T23:59:59.000Z',
        category: 'Medical',
        imageUrl: undefined,
        createdAt: '2025-11-01T00:00:00.000Z',
        updatedAt: '2025-11-21T00:00:00.000Z'
      },
      {
        id: '2', 
        title: 'Education for Underprivileged Kids',
        description: 'Providing educational resources, books, and supplies to children who cannot afford basic school materials. Help us build a brighter future through education.',
        goalAmount: 25000,
        currentAmount: 18500,
        status: 'ACTIVE' as const,
        ownerId: 'admin',
        startDate: '2025-10-15T00:00:00.000Z',
        endDate: '2025-12-15T23:59:59.000Z',
        category: 'Education',
        imageUrl: undefined,
        createdAt: '2025-10-15T00:00:00.000Z',
        updatedAt: '2025-11-20T00:00:00.000Z'
      },
      {
        id: '3',
        title: 'Clean Water Project',
        description: 'Building wells and water purification systems in rural communities that lack access to clean drinking water. Your contribution can save lives.',
        goalAmount: 75000,
        currentAmount: 45250,
        status: 'ACTIVE' as const,
        ownerId: 'admin',
        startDate: '2025-09-01T00:00:00.000Z',
        endDate: '2026-02-28T23:59:59.000Z',
        category: 'Community',
        imageUrl: undefined,
        createdAt: '2025-09-01T00:00:00.000Z',
        updatedAt: '2025-11-21T00:00:00.000Z'
      }
    ];
    setCampaigns(mockData);
  };

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

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading campaigns...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-2">
            <span className="text-red-500">❌</span>
            <div>
              <h3 className="text-red-900 font-semibold">Error Loading Campaigns</h3>
              <p className="text-red-700">{error}</p>
              <button
                onClick={loadCampaigns}
                className="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Featured Campaign */}
      {!loading && !error && campaigns && campaigns.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold mb-2">✨ {campaigns[0].title}</h2>
              <p className="text-blue-100 mb-4">{campaigns[0].description.substring(0, 100)}...</p>
              <div className="flex items-center space-x-4">
                <div>
                  <p className="text-sm text-blue-100">Raised</p>
                  <p className="text-xl font-bold">{campaignService.formatCurrency(campaigns[0].currentAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-100">Goal</p>
                  <p className="text-xl font-bold">{campaignService.formatCurrency(campaigns[0].goalAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-100">Progress</p>
                  <p className="text-xl font-bold">{campaignService.calculateProgress(campaigns[0])}%</p>
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
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300" 
              style={{ width: `${campaignService.calculateProgress(campaigns[0])}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Campaign Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {!campaigns || campaigns.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Campaigns</h3>
              <p className="text-gray-600">
                {hasAdminAccess 
                  ? 'Create the first campaign to get started!'
                  : 'Check back soon for new campaigns to support.'
                }
              </p>
              {hasAdminAccess && (
                <button 
                  onClick={() => window.location.href = '/admin/campaigns'}
                  className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Campaign
                </button>
              )}
            </div>
          ) : (
            campaigns && campaigns.map((campaign, index) => {
              const progress = campaignService.calculateProgress(campaign);
              const colors = ['green', 'blue', 'purple', 'indigo', 'pink'];
              const color = colors[index % colors.length];
              const icons = ['🏥', '📚', '🍽️', '🌍', '❤️', '🏠', '🎓', '🐾'];
              const icon = icons[index % icons.length];

              return (
                <div key={campaign.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className={`h-48 bg-gradient-to-br from-${color}-400 to-${color}-600 flex items-center justify-center relative`}>
                    <span className="text-6xl">{campaign.imageUrl ? '🖼️' : icon}</span>
                    <div className={`absolute top-4 right-4 px-2 py-1 bg-${campaignService.getStatusColor(campaign.status)}-100 text-${campaignService.getStatusColor(campaign.status)}-800 text-xs font-medium rounded-full`}>
                      {campaign.status}
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                      {campaign.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {campaign.description}
                    </p>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Raised</p>
                        <p className="font-bold text-gray-900">
                          {campaignService.formatCurrency(campaign.currentAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Goal</p>
                        <p className="font-bold text-gray-900">
                          {campaignService.formatCurrency(campaign.goalAmount)}
                        </p>
                      </div>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2 mb-4">
                      <div 
                        className={`bg-${color}-500 h-2 rounded-full transition-all duration-300`} 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-600">
                        {progress}% of goal • {campaignService.formatDate(campaign.endDate)}
                      </span>
                    </div>
                    <button className={`w-full bg-${color}-600 text-white py-2 rounded-lg hover:bg-${color}-700 transition-colors`}>
                      {isGuest ? 'Donate' : 'Support'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

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
