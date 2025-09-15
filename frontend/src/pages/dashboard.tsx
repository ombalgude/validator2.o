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
      <div className="min-h-screen gradient-bg">
        <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="md:flex md:items-center md:justify-between mb-8 animate-fade-in">
            <div className="flex-1 min-w-0">
              <h2 className="text-4xl font-bold text-gray-900 mb-2">
                Dashboard
              </h2>
              <p className="text-lg text-gray-600">
                Welcome back, <span className="font-semibold text-blue-600">{user.email}</span>
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="card card-hover p-6 animate-slide-up">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                    <ChartBarIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Certificates
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {statsLoading ? (
                        <div className="spinner"></div>
                      ) : (
                        overview.totalCertificates || 0
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="card card-hover p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                    <CheckCircleIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Verified
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {statsLoading ? (
                        <div className="spinner"></div>
                      ) : (
                        overview.verifiedCertificates || 0
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="card card-hover p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                    <ExclamationTriangleIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Suspicious
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {statsLoading ? (
                        <div className="spinner"></div>
                      ) : (
                        overview.suspiciousCertificates || 0
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="card card-hover p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <BuildingOfficeIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Institutions
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {statsLoading ? (
                        <div className="spinner"></div>
                      ) : (
                        overview.totalInstitutions || 0
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 mb-8">
            {/* Verification Trends */}
            <div className="card p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Verification Trends
                </h3>
                <div className="flex space-x-2">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                    <span className="text-sm text-gray-600">Verified</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                    <span className="text-sm text-gray-600">Suspicious</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                    <span className="text-sm text-gray-600">Fake</span>
                  </div>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="verified"
                      stroke="#10B981"
                      strokeWidth={3}
                      name="Verified"
                      dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="suspicious"
                      stroke="#F59E0B"
                      strokeWidth={3}
                      name="Suspicious"
                      dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="fake"
                      stroke="#EF4444"
                      strokeWidth={3}
                      name="Fake"
                      dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Status Distribution
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
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