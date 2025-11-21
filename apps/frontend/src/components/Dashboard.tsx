'use client';

import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user, isAdmin, isCampaignOwner, hasAdminAccess, isGuest } = useAuth();

  if (!user) {
    return null;
  }

  // Stats data - would come from API in real app
  const stats = [
    {
      name: 'Total Campaigns',
      value: hasAdminAccess ? '12' : '3',
      change: '+2.1%',
      changeType: 'positive',
    },
    {
      name: 'Active Donations',
      value: hasAdminAccess ? '$24,500' : '$1,250',
      change: '+5.4%',
      changeType: 'positive',
    },
    {
      name: hasAdminAccess ? 'Total Users' : 'Your Donations',
      value: hasAdminAccess ? '1,234' : '8',
      change: '+12.5%',
      changeType: 'positive',
    },
    {
      name: hasAdminAccess ? 'Success Rate' : 'Impact Score',
      value: '87%',
      change: '+3.2%',
      changeType: 'positive',
    },
  ];

  const activities = hasAdminAccess 
    ? [
        {
          id: 1,
          type: 'donation',
          message: 'New donation of $500 to Clean Water Initiative',
          time: '2 minutes ago',
        },
        {
          id: 2,
          type: 'campaign',
          message: 'Education for All campaign reached 75% of goal',
          time: '15 minutes ago',
        },
        {
          id: 3,
          type: 'user',
          message: 'New user registration: john.doe@example.com',
          time: '1 hour ago',
        },
        {
          id: 4,
          type: 'campaign',
          message: 'Medical Aid campaign was approved',
          time: '2 hours ago',
        },
      ]
    : [
        {
          id: 1,
          type: 'donation',
          message: 'You donated $100 to Clean Water Initiative',
          time: '2 days ago',
        },
        {
          id: 2,
          type: 'campaign',
          message: 'Education for All reached 75% thanks to your support',
          time: '1 week ago',
        },
        {
          id: 3,
          type: 'donation',
          message: 'You donated $50 to Medical Aid Fund',
          time: '2 weeks ago',
        },
      ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-md border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-black">
              Welcome back, {user.name}!
              {isGuest && <span className="text-gray-500 ml-2">(Guest)</span>}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {hasAdminAccess 
                ? `${isAdmin ? 'Administrator' : 'Campaign Owner'} Dashboard`
                : 'Your donation dashboard'
              }
            </p>
          </div>
          
          <div className="text-right text-sm">
            <p className="font-medium text-black">{user.email || 'Guest User'}</p>
            <p className="text-gray-500 capitalize">
              {user.role.toLowerCase().replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.name}
            className="bg-white border border-gray-200 rounded-md overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl font-bold text-black">
                    {item.value}
                  </div>
                </div>
              </div>
              <div className="mt-1">
                <div className="text-sm font-medium text-gray-600">
                  {item.name}
                </div>
                <div className="text-sm text-gray-500">
                  {item.change} from last month
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white border border-gray-200 rounded-md">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-black">
              {hasAdminAccess ? 'Recent Platform Activity' : 'Your Activity'}
            </h3>
          </div>
          <div className="px-6 py-4">
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'donation' ? 'bg-black' :
                      activity.type === 'campaign' ? 'bg-gray-600' : 'bg-gray-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-black">{activity.message}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions Panel */}
        <div className="bg-white border border-gray-200 rounded-md">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-black">
              {hasAdminAccess ? 'Admin Actions' : 'Quick Actions'}
            </h3>
          </div>
          <div className="px-6 py-4">
            <div className="space-y-3">
              {hasAdminAccess ? (
                <>
                  {isAdmin && (
                    <>
                      <button className="w-full text-left p-4 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors">
                        <div className="font-medium text-black">Manage Users</div>
                        <div className="text-sm text-gray-500">View and manage user accounts</div>
                      </button>
                      <button className="w-full text-left p-4 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors">
                        <div className="font-medium text-black">System Settings</div>
                        <div className="text-sm text-gray-500">Configure platform settings</div>
                      </button>
                    </>
                  )}
                  
                  <button className="w-full text-left p-4 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors">
                    <div className="font-medium text-black">Manage Campaigns</div>
                    <div className="text-sm text-gray-500">Create and manage campaigns</div>
                  </button>
                  
                  <button className="w-full text-left p-4 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors">
                    <div className="font-medium text-black">View Reports</div>
                    <div className="text-sm text-gray-500">Analytics and performance reports</div>
                  </button>
                  
                  <button className="w-full text-left p-4 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors">
                    <div className="font-medium text-black">Review Donations</div>
                    <div className="text-sm text-gray-500">Monitor donation activities</div>
                  </button>
                </>
              ) : (
                <>
                  <button className="w-full text-left p-4 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors">
                    <div className="font-medium text-black">Browse Campaigns</div>
                    <div className="text-sm text-gray-500">Find causes to support</div>
                  </button>
                  
                  <button className="w-full text-left p-4 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors">
                    <div className="font-medium text-black">Donation History</div>
                    <div className="text-sm text-gray-500">View your past donations</div>
                  </button>
                  
                  <button className="w-full text-left p-4 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors">
                    <div className="font-medium text-black">Account Settings</div>
                    <div className="text-sm text-gray-500">Update your profile and preferences</div>
                  </button>

                  {isGuest && (
                    <button className="w-full text-left p-4 rounded-md border border-gray-900 bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="font-medium text-black">Upgrade Account</div>
                      <div className="text-sm text-gray-600">Create a full account to track donations</div>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Guest Account Notice */}
      {isGuest && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-6">
          <div>
            <h3 className="text-sm font-medium text-black">
              Guest Account
            </h3>
            <div className="mt-2 text-sm text-gray-600">
              <p>
                You're using a guest account. Create a full account to:
              </p>
              <ul className="mt-1 list-disc list-inside">
                <li>Track all your donations</li>
                <li>Receive campaign updates</li>
                <li>Save favorite causes</li>
                <li>Get donation receipts</li>
              </ul>
            </div>
            <div className="mt-4">
              <button className="bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 transition-colors font-medium">
                Upgrade to Full Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
