'use client';

import React, { useState } from 'react';
import { donationService, CreateDonationRequest, generateMockBankAccountId } from '../lib/donation';
import { formatCurrency } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { Campaign } from '../lib/campaign';

interface DonationModalProps {
  campaign: Campaign;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function DonationModal({ campaign, isOpen, onClose, onSuccess }: DonationModalProps) {
  const { user, isAuthenticated } = useAuth();
  const [amount, setAmount] = useState<string>('');
  const [donorName, setDonorName] = useState<string>(user?.name || '');
  const [donorEmail, setDonorEmail] = useState<string>(user?.email || '');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Predefined amounts
  const predefinedAmounts = [25, 50, 100, 250, 500];

  const handleAmountClick = (value: number) => {
    setAmount(value.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const donationAmount = parseFloat(amount);

    // Validation
    if (!donationAmount || donationAmount < 1) {
      setError('Please enter a valid donation amount (minimum $1)');
      return;
    }

    if (!isAuthenticated && !donorEmail.trim()) {
      setError('Email is required for guest donations');
      return;
    }

    if (!isAuthenticated && !donorName.trim()) {
      setError('Name is required for guest donations');
      return;
    }

    setIsLoading(true);

    try {
      const donationData: CreateDonationRequest = {
        campaignId: campaign.id,
        amount: donationAmount,
        isAnonymous,
        bankAccountId: generateMockBankAccountId(), // Mock bank account for demo
      };

      // For guest donations, include name and email
      if (!isAuthenticated) {
        donationData.donorName = donorName.trim();
        donationData.donorEmail = donorEmail.trim();
      }

      const response = await donationService.createDonation(donationData);

      if (response.success && response.data) {
        setSuccess(`Thank you! Your donation of ${formatCurrency(donationAmount)} is being processed.`);
        
        // Reset form
        setAmount('');
        setDonorName(user?.name || '');
        setDonorEmail(user?.email || '');
        setIsAnonymous(false);

        // Call success callback after a delay
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      } else {
        setError(response.error?.message || 'Failed to process donation');
      }
    } catch (err) {
      setError('Network error - please try again');
      console.error('Donation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Make a Donation</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Campaign Info */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 text-sm">Supporting:</h3>
            <p className="text-gray-700 mt-1">{campaign.title}</p>
            <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
              <span>Goal: {formatCurrency(campaign.goalAmount)}</span>
              <span>Raised: {formatCurrency(campaign.currentAmount)}</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {/* Donation Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Donation Amount
            </label>
            
            {/* Predefined Amounts */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {predefinedAmounts.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleAmountClick(value)}
                  className={`py-2 px-3 border rounded-lg text-sm font-medium transition-colors ${
                    amount === value.toString()
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                  }`}
                >
                  ${value}
                </button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Custom amount"
                min="1"
                step="0.01"
                required
              />
            </div>
          </div>

          {/* Guest Information */}
          {!isAuthenticated && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={donorEmail}
                  onChange={(e) => setDonorEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email for receipt"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  We'll send you a receipt and donation updates
                </p>
              </div>
            </>
          )}

          {/* Anonymous Donation */}
          <div className="flex items-center">
            <input
              id="anonymous"
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="anonymous" className="ml-2 block text-sm text-gray-700">
              Make this donation anonymous
            </label>
          </div>

          {/* Mock Bank Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-blue-800 text-sm font-medium">Demo Mode</p>
                <p className="text-blue-700 text-xs">This is a simulated payment for demonstration purposes</p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={isLoading || !!success}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : success ? (
                'Success!'
              ) : (
                `Donate ${amount ? formatCurrency(parseFloat(amount) || 0) : '$0'}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
