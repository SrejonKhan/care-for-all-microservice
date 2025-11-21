'use client';

import { useAuth } from '../../../contexts/AuthContext';

export default function AdminChatPage() {
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
        <h1 className="text-3xl font-bold text-gray-900">Support Chat Management</h1>
        <p className="text-gray-600 mt-2">Manage customer support conversations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <span className="text-2xl">🔴</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Chats</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⏳</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">5</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Resolved Today</p>
              <p className="text-2xl font-bold text-gray-900">28</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">⏱️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Response</p>
              <p className="text-2xl font-bold text-gray-900">3.2m</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface Mockup */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Support Conversations</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">JD</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">John Doe</p>
                <p className="text-sm text-gray-600">Payment issue with campaign donation</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Urgent</span>
              <span className="text-sm text-gray-500">2m ago</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">SM</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Sarah Miller</p>
                <p className="text-sm text-gray-600">Question about campaign verification</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Pending</span>
              <span className="text-sm text-gray-500">15m ago</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">RJ</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Robert Johnson</p>
                <p className="text-sm text-gray-600">General inquiry about platform fees</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Resolved</span>
              <span className="text-sm text-gray-500">1h ago</span>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-6xl mb-4">🚧</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Coming Soon</h2>
        <p className="text-gray-600 mb-6">
          Full-featured chat support system is being developed:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Real-time chat with users</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Ticket management system</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Automated responses</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Chat history and analytics</span>
          </div>
        </div>
      </div>
    </div>
  );
}
