'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { campaignService, Campaign } from '../../lib/campaign';
import { formatCurrency, calculateProgress } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

export default function PublicCampaignsPage() {
  const { isAuthenticated, isLoading } = useAuth();
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
      // Load all campaigns for public viewing
      const response = await campaignService.listCampaigns({
        pageSize: 20
      });

      if (response.success && response.data) {
        setCampaigns(response.data.items || []);
      } else {
        setError('Failed to load campaigns');
      }
    } catch (err) {
      setError('Network error - unable to load campaigns');
      console.error('Error loading campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">CareForAll</h1>
            </div>
            <div className="flex items-center space-x-4">
              {!isAuthenticated && !isLoading && (
                <>
                  <Link 
                    href="/auth" 
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Login
                  </Link>
                  <Link 
                    href="/auth" 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Get Started
                  </Link>
                </>
              )}
              {isAuthenticated && (
                <Link 
                  href="/dashboard" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Make a Difference Today
          </h2>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Support meaningful campaigns and help create positive change in communities around the world.
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Campaigns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {campaigns.length > 0 ? (
            campaigns.map((campaign) => (
              <div key={campaign.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                  {campaign.imageUrl ? (
                    <img
                      className="h-full w-full object-cover"
                      src={campaign.imageUrl}
                      alt={campaign.title}
                    />
                  ) : (
                    <div className="text-white text-center">
                      <div className="text-4xl mb-2">💝</div>
                      <p className="text-sm font-medium">{campaign.category || 'Campaign'}</p>
                    </div>
                  )}
                </div>
                
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                      {campaign.category || 'General'}
                    </span>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      campaign.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {campaign.status}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                    {campaign.title}
                  </h3>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {campaign.description}
                  </p>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                      <span>Raised: {formatCurrency(campaign.currentAmount)}</span>
                      <span>Goal: {formatCurrency(campaign.goalAmount)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${Math.min(calculateProgress(campaign.currentAmount, campaign.goalAmount), 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-right text-xs text-gray-500 mt-1">
                      {calculateProgress(campaign.currentAmount, campaign.goalAmount)}% Funded
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                      {isAuthenticated ? 'Donate Now' : 'View Details'}
                    </button>
                    <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="text-6xl mb-4">🌟</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No campaigns yet</h3>
              <p className="text-gray-600">
                Be the first to create a campaign and make a difference!
              </p>
              {isAuthenticated && (
                <Link 
                  href="/admin/campaigns" 
                  className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Campaign
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Call to Action */}
        {!isAuthenticated && campaigns.length > 0 && (
          <div className="mt-16 text-center bg-blue-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">Ready to Make an Impact?</h3>
            <p className="text-lg mb-6 opacity-90">
              Join thousands of people making a difference in their communities
            </p>
            <div className="space-x-4">
              <Link 
                href="/auth" 
                className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Start Donating
              </Link>
              <Link 
                href="/auth" 
                className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
              >
                Create Campaign
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
