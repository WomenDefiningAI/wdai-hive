import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Users, Activity, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  participationRate: number;
  totalResponses: number;
  thisWeekResponses: number;
  topCategories: Array<{ category: string; count: number }>;
  topTools: Array<{ tool: string; count: number }>;
  recentResponses: Array<{
    id: string;
    slack_user_id: string;
    slack_display_name: string;
    participated: boolean;
    categories: string[];
    tools: string[];
    custom_details: string;
    created_at: string;
  }>;
}

const Dashboard: React.FC = () => {
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await axios.get('/api/dashboard/stats');
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error loading dashboard data</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">WDAI Hive Dashboard</h1>
        <p className="text-gray-600 mt-2">AI Engagement & Play Tracker</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.activeUsers || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Participation Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.participationRate ? `${Math.round(stats.participationRate * 100)}%` : '0%'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.thisWeekResponses || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Categories */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Categories</h2>
          <div className="space-y-3">
            {stats?.topCategories?.map((category, index) => (
              <div key={category.category} className="flex items-center justify-between">
                <span className="text-gray-700">{category.category}</span>
                <span className="text-sm font-medium text-gray-900">{category.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Tools */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Tools</h2>
          <div className="space-y-3">
            {stats?.topTools?.map((tool, index) => (
              <div key={tool.tool} className="flex items-center justify-between">
                <span className="text-gray-700">{tool.tool}</span>
                <span className="text-sm font-medium text-gray-900">{tool.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Responses */}
      <div className="mt-8 bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Responses</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {stats?.recentResponses?.map((response) => (
            <div key={response.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {response.slack_display_name?.charAt(0) || 'U'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {response.slack_display_name || 'Unknown User'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(response.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {response.participated ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Participated
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      No Activity
                    </span>
                  )}
                </div>
              </div>
              {response.participated && (
                <div className="mt-2">
                  {response.categories && response.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {response.categories.map((category) => (
                        <span
                          key={category}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  )}
                  {response.tools && response.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {response.tools.map((tool) => (
                        <span
                          key={tool}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}
                  {response.custom_details && (
                    <p className="text-sm text-gray-600 mt-2">{response.custom_details}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 