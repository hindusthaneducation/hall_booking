import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { FileCheck, Calendar, TrendingUp } from 'lucide-react';
import type { Database } from '../../types/database';

type Booking = Database['public']['Tables']['bookings']['Row'];

export function PrincipalDashboard() {
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch all bookings to calculate stats
      const { data, error } = await api.get<Booking[]>('/bookings');

      if (error) throw error;

      if (data) {
        const pending = data.filter((b) => b.status === 'pending').length;
        const approved = data.filter((b) => b.status === 'approved').length;
        const rejected = data.filter((b) => b.status === 'rejected').length;

        setStats({
          pending,
          approved,
          rejected,
          total: data.length,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Principal Dashboard</h1>
        <p className="text-gray-600">Manage hall booking approvals</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Approval</p>
              <p className="text-3xl font-semibold text-yellow-600 mt-2">{stats.pending}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-full">
              <FileCheck className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-3xl font-semibold text-green-600 mt-2">{stats.approved}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <FileCheck className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-3xl font-semibold text-red-600 mt-2">{stats.rejected}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-full">
              <FileCheck className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-3xl font-semibold text-blue-600 mt-2">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Link
          to="/approvals"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Pending Approvals</h2>
              <p className="text-gray-600">Review and process booking requests</p>
              <p className="text-3xl font-bold text-yellow-600 mt-4">{stats.pending}</p>
            </div>
            <FileCheck className="w-16 h-16 text-yellow-600" />
          </div>
        </Link>

        <Link
          to="/all-bookings"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">All Bookings</h2>
              <p className="text-gray-600">View complete booking history</p>
              <p className="text-3xl font-bold text-blue-600 mt-4">{stats.total}</p>
            </div>
            <Calendar className="w-16 h-16 text-blue-600" />
          </div>
        </Link>
      </div>
    </div>
  );
}
