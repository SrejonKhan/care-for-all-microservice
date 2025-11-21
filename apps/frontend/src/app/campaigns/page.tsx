'use client';

import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { campaignService, Campaign } from '../../lib/campaign';
import { donationService } from '../../lib/donation';

export default function CampaignsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Donation modal state
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [donationAmount, setDonationAmount] = useState<string>('');
  const [donorName, setDonorName] = useState<string>('');
  const [donorEmail, setDonorEmail] = useState<string>('');
  const [bankAccountId, setBankAccountId] = useState<string>('bank_acc_guest');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [donationLoading, setDonationLoading] = useState(false);
  const [donationError, setDonationError] = useState<string | null>(null);
  const [donationSuccess, setDonationSuccess] = useState(false);
  
  // Derived values from user state
  const isGuest = !isAuthenticated || user?.isGuest;
  const hasAdminAccess = user?.role === 'ADMIN';

  useEffect(() => {
    // Load campaigns for all users (authenticated and guests)
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load all campaigns (not just ACTIVE) so guests and users can see all
      const response = await campaignService.listCampaigns({
        pageSize: 20
      });

      if (response.success && response.data) {
        setCampaigns(response.data.campaigns);
      } else {
        setError(response.error?.message || 'Failed to load campaigns');
      }
    } catch (err) {
      setError('Network error while loading campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleDonateClick = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowDonationModal(true);
    setDonationError(null);
    setDonationSuccess(false);
    setDonationAmount('');
    setDonorName(user?.name || '');
    setDonorEmail(user?.email || '');
  };

  const handleCloseDonationModal = () => {
    setShowDonationModal(false);
    setSelectedCampaign(null);
    setDonationAmount('');
    setDonorName('');
    setDonorEmail('');
    setDonationError(null);
    setDonationSuccess(false);
  };

  const handleSubmitDonation = async () => {
    if (!selectedCampaign) return;
    
    const amount = parseFloat(donationAmount);
    if (isNaN(amount) || amount <= 0) {
      setDonationError('Please enter a valid donation amount');
      return;
    }

    if (!isAuthenticated && !donorEmail) {
      setDonationError('Please provide your email address');
      return;
    }

    setDonationLoading(true);
    setDonationError(null);

    try {
      const result = await donationService.createDonation({
        campaignId: selectedCampaign.id,
        amount,
        donorName: donorName || undefined,
        donorEmail: donorEmail || undefined,
        isAnonymous,
        bankAccountId,
      });

      if (result.success) {
        setDonationSuccess(true);
        setDonationError(null);
        // Reload campaigns to show updated amount
        setTimeout(() => {
          loadCampaigns();
          handleCloseDonationModal();
        }, 2000);
      } else {
        setDonationError(result.error?.message || 'Failed to process donation');
      }
    } catch (err) {
      setDonationError('Network error. Please try again.');
    } finally {
      setDonationLoading(false);
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
          <div>
            <h3 className="text-red-900 font-semibold">Error Loading Campaigns</h3>
            <p className="text-red-700 mt-1">{error}</p>
            <button
              onClick={loadCampaigns}
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Featured Campaign */}
      {!loading && !error && campaigns && campaigns.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold mb-2">{campaigns[0].title}</h2>
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
              <button 
                onClick={() => handleDonateClick(campaigns[0])}
                className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
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
              <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-gray-400 text-2xl font-bold">!</span>
              </div>
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

              return (
                <div key={campaign.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className={`h-48 bg-gradient-to-br from-${color}-400 to-${color}-600 flex items-center justify-center relative`}>
                    <span className="text-white text-4xl font-bold">{campaign.category?.charAt(0) || 'C'}</span>
                    <div className={`absolute top-4 right-4 px-2 py-1 bg-white text-${color}-800 text-xs font-medium rounded-full`}>
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
                    <button 
                      onClick={() => handleDonateClick(campaign)}
                      className={`w-full bg-${color}-600 text-white py-2 rounded-lg hover:bg-${color}-700 transition-colors`}
                    >
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
          <div>
            <h3 className="text-lg font-semibold text-orange-900">Anonymous Donations</h3>
            <p className="text-orange-800 mt-2">
              As a guest, you can donate anonymously to any campaign. During payment, you can provide 
              your email address to receive receipts and track your donation impact.
            </p>
            <div className="mt-4">
              <button 
                onClick={() => window.location.href = '/auth'}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700 transition-colors"
              >
                Create Account for Full Features
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Donation Modal */}
      {showDonationModal && selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Make a Donation</h2>
              <button 
                onClick={handleCloseDonationModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {donationSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-green-600 text-3xl">✓</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Donation Successful!</h3>
                <p className="text-gray-600">Thank you for your generous contribution.</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 mb-1">{selectedCampaign.title}</h3>
                  <p className="text-sm text-gray-600">Goal: {campaignService.formatCurrency(selectedCampaign.goalAmount)}</p>
                </div>

                {donationError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{donationError}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Donation Amount *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={donationAmount}
                      onChange={(e) => setDonationAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter amount"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Name {!isAuthenticated && '*'}
                    </label>
                    <input
                      type="text"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your name"
                    />
                  </div>

                  {!isAuthenticated && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={donorEmail}
                        onChange={(e) => setDonorEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="your@email.com"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Account
                    </label>
                    <select
                      value={bankAccountId}
                      onChange={(e) => setBankAccountId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="bank_acc_guest">Guest Account ($1000)</option>
                      <option value="bank_acc_001">Account 001 ($1000)</option>
                      <option value="bank_acc_002">Account 002 ($500)</option>
                      <option value="bank_acc_003">Account 003 ($100)</option>
                      <option value="bank_acc_004">Account 004 ($50)</option>
                      <option value="bank_acc_007">Account 007 ($0 - Will Fail)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Demo: Select different accounts to test balance verification</p>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="anonymous"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="anonymous" className="ml-2 text-sm text-gray-700">
                      Make this donation anonymous
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={handleCloseDonationModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={donationLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitDonation}
                    disabled={donationLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
                  >
                    {donationLoading ? 'Processing...' : 'Donate Now'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Coming Soon */}
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <span className="text-blue-600 text-2xl font-bold">+</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">More Features Coming Soon</h2>
        <p className="text-gray-600 mb-6">
          Enhanced campaign features are being developed:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
          <div className="flex items-center space-x-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Secure payment processing</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Campaign updates and messages</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Donation tracking and receipts</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-600 font-bold">✓</span>
            <span>Social sharing features</span>
          </div>
        </div>
      </div>
    </div>
  );
}
