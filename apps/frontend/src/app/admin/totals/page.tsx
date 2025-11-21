'use client';

import { useAuth } from '../../../contexts/AuthContext';

export default function AdminTotalsPage() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="text-gray-600 mt-2">You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Financial Reports & Totals</h1>
        <p className="text-gray-600 mt-2">Comprehensive financial analytics and reports</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">💵</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Platform Revenue</p>
              <p className="text-2xl font-bold text-gray-900">$240K</p>
              <p className="text-xs text-green-600">+12.5% from last month</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">🏦</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Processing Fees</p>
              <p className="text-2xl font-bold text-gray-900">$18.2K</p>
              <p className="text-xs text-blue-600">2.8% of total</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Net to Campaigns</p>
              <p className="text-2xl font-bold text-gray-900">$2.18M</p>
              <p className="text-xs text-purple-600">97.2% of donations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue Trend</h3>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2">📈</div>
            <p className="text-gray-600">Interactive charts coming soon</p>
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-6xl mb-4">🚧</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Coming Soon</h2>
        <p className="text-gray-600 mb-6">
          Advanced financial reporting tools are in development:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Real-time financial dashboards</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Monthly and annual reports</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Tax reporting and compliance</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Custom report builder</span>
          </div>
        </div>
      </div>
    </div>
  );
}
