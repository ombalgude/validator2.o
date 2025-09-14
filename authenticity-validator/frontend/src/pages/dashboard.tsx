import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/utils/api';
import Layout from '@/components/Layout/Layout';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6B7280'];

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
    enabled: !!user,
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['dashboard-trends', selectedPeriod],
    queryFn: () => dashboardApi.getTrends(selectedPeriod),
    enabled: !!user,
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: dashboardApi.getAlerts,
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900">Please log in to access the dashboard</h1>
        </div>
      </Layout>
    );
  }

  const overview = stats?.overview || {};
  const recentVerifications = stats?.recentVerifications || [];
  const monthlyStats = stats?.monthlyStats || [];

  // Prepare chart data
  const statusData = [
    { name: 'Verified', value: overview.verifiedCertificates || 0, color: '#10B981' },
    { name: 'Suspicious', value: overview.suspiciousCertificates || 0, color: '#F59E0B' },
    { name: 'Fake', value: overview.fakeCertificates || 0, color: '#EF4444' },
    { name: 'Pending', value: overview.pendingCertificates || 0, color: '#6B7280' },
  ];

  const trendData = trends?.trends?.map((trend: any) => {
    const date = new Date(trend._id);
    const statuses = trend.statuses.reduce((acc: any, status: any) => {
      acc[status.status] = status.count;
      return acc;
    }, {});

    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      verified: statuses.verified || 0,
      suspicious: statuses.suspicious || 0,
      fake: statuses.fake || 0,
      pending: statuses.pending || 0,
    };
  }) || [];

  const institutionData = trends?.institutionStats?.slice(0, 10) || [];

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Dashboard
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Welcome back, {user.email}
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ChartBarIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Certificates
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {statsLoading ? '...' : overview.totalCertificates || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Verified
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {statsLoading ? '...' : overview.verifiedCertificates || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Suspicious
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {statsLoading ? '...' : overview.suspiciousCertificates || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BuildingOfficeIcon className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Institutions
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {statsLoading ? '...' : overview.totalInstitutions || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Verification Trends */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Verification Trends
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="verified"
                      stroke="#10B981"
                      strokeWidth={2}
                      name="Verified"
                    />
                    <Line
                      type="monotone"
                      dataKey="suspicious"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      name="Suspicious"
                    />
                    <Line
                      type="monotone"
                      dataKey="fake"
                      stroke="#EF4444"
                      strokeWidth={2}
                      name="Fake"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Status Distribution
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Institution Performance */}
          {institutionData.length > 0 && (
            <div className="mt-8">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Institution Performance
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={institutionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="institutionName" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="verified" fill="#10B981" name="Verified" />
                        <Bar dataKey="suspicious" fill="#F59E0B" name="Suspicious" />
                        <Bar dataKey="fake" fill="#EF4444" name="Fake" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Verifications */}
          <div className="mt-8">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Recent Verifications
                </h3>
                <div className="flow-root">
                  <ul className="-my-5 divide-y divide-gray-200">
                    {recentVerifications.slice(0, 5).map((verification: any) => (
                      <li key={verification._id} className="py-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            {verification.result === 'verified' ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-400" />
                            ) : verification.result === 'suspicious' ? (
                              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                            ) : (
                              <XCircleIcon className="h-5 w-5 text-red-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {verification.certificateId?.studentName || 'Unknown Student'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {verification.verifiedBy?.email || 'Unknown Verifier'}
                            </p>
                          </div>
                          <div className="flex-shrink-0 text-sm text-gray-500">
                            {new Date(verification.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}