import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    Users,
    ArrowRight,
    GraduationCap,
    CheckCircle,
    XCircle,
    CalendarDays,
    Clock,
    School,
    Building2
} from 'lucide-react';
import HindusthanLogo from '../../images/hindusthan_logo.webp';



export function AdminDashboard() {
    const { profile } = useAuth();
    const [stats, setStats] = useState({
        colleges: 0,
        halls: 0,
        hods: 0,
        principals: 0
    });
    const [recentBookings, setRecentBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(10);

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                const { data } = await api.get<{ stats: any, recentBookings: any[] }>('/dashboard/stats');
                if (data) {
                    setStats(data.stats || { colleges: 0, halls: 0, hods: 0, principals: 0 });
                    setRecentBookings(data.recentBookings || []);
                }
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchDashboardData();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'text-green-600 bg-green-50';
            case 'rejected': return 'text-red-600 bg-red-50';
            default: return 'text-yellow-600 bg-yellow-50';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'confirmed': return <CheckCircle className="w-4 h-4" />;
            case 'rejected': return <XCircle className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-semibold text-gray-900 mb-8">
                {profile?.role === 'super_admin' ? 'System Overview' : `${profile?.institution?.name || 'College'} Dashboard`}
            </h1>

            {/* Top Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    icon={<img src={HindusthanLogo} alt="Logo" className="w-8 h-8 object-contain" />}
                    bg="bg-indigo-50"
                    label="Total Colleges"
                    value={stats.colleges}
                    desc="Institutions"
                />
                <StatCard
                    icon={<img src={HindusthanLogo} alt="Logo" className="w-8 h-8 object-contain" />}
                    bg="bg-blue-50"
                    label="Total Halls"
                    value={stats.halls}
                    desc="Available Halls"
                />
                <StatCard
                    icon={<GraduationCap className="w-8 h-8 text-purple-600" />}
                    bg="bg-purple-50"
                    label="Total Principals"
                    value={stats.principals}
                    desc="Active Principals"
                />
                <StatCard
                    icon={<Users className="w-8 h-8 text-green-600" />}
                    bg="bg-green-50"
                    label="Total HODs"
                    value={stats.hods}
                    desc="Dept. Users"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Content: Recent Activity (Taking up 2 columns) */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                <CalendarDays className="w-5 h-5 mr-2 text-gray-500" />
                                Recent Booking Activity
                            </h2>
                            <span className="text-xs text-brand-primary bg-brand-base/10 px-2 py-1 rounded-full">
                                {recentBookings.length} Total
                            </span>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {recentBookings.length > 0 ? (
                                <>
                                    {recentBookings?.slice(0, visibleCount).map((booking) => {
                                        // Determine target link based on role and status
                                        // If admin/principal and pending, go to approvals or details
                                        // If user, go to booking details
                                        // Simpler: Go to Hall Details for everyone, or Approvals if super admin/principal and pending?
                                        // Let's go to Hall details generally, or Approvals if pending and user is admin.
                                        const targetLink = (profile?.role === 'principal' || profile?.role === 'super_admin') && booking.status === 'pending'
                                            ? '/approvals'
                                            : `/halls/${booking.hall_id}`; // Assuming hall_id exists on booking object, usually it does. 
                                        // The type Booking above includes Hall, but let's check recentBookings fetch.
                                        // recentBookings from API likely has hall_id.

                                        return (
                                            <Link
                                                to={targetLink}
                                                key={booking.id}
                                                className="block p-4 hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-4">
                                                        <div className={`p-2 rounded-lg ${getStatusColor(booking.status)}`}>
                                                            {getStatusIcon(booking.status)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900 line-clamp-1">{booking.event_title || 'Event Booking'}</p>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-semibold text-brand-primary">
                                                                    {booking.institution_name || 'Unknown Institution'} • {booking.hall_name || 'Unknown Hall'}
                                                                </span>
                                                                <span className="text-xs text-gray-500">
                                                                    {new Date(booking.booking_date).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ml-2 whitespace-nowrap ${getStatusColor(booking.status)}`}>
                                                        {booking.status}
                                                    </span>
                                                </div>
                                            </Link>
                                        );
                                    })}

                                    {visibleCount < recentBookings.length && (
                                        <div className="p-4 text-center border-t border-gray-100">
                                            <button
                                                onClick={() => setVisibleCount(prev => prev + 5)}
                                                className="text-sm text-brand-primary hover:text-brand-secondary font-medium focus:outline-none"
                                            >
                                                Show More Activity
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="p-8 text-center text-gray-500">No recent bookings found.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar: Quick Actions (Taking up 1 column) */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Management</h2>
                        <div className="space-y-3">
                            <Link to="/departments-management" className="flex items-center justify-between p-3 bg-brand-base/20 rounded-lg hover:bg-brand-base hover:text-brand-primary transition-colors group">
                                <div className="flex items-center">
                                    <School className="w-5 h-5 text-gray-500 mr-3 group-hover:text-brand-primary" />
                                    <span className="font-medium text-gray-700 group-hover:text-brand-primary">Departments</span>
                                </div>
                                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-primary" />
                            </Link>
                            <Link to="/halls-management" className="flex items-center justify-between p-3 bg-brand-base/20 rounded-lg hover:bg-brand-base hover:text-brand-primary transition-colors group">
                                <div className="flex items-center">
                                    <Building2 className="w-5 h-5 text-gray-500 mr-3 group-hover:text-brand-primary" />
                                    <span className="font-medium text-gray-700 group-hover:text-brand-primary">Halls</span>
                                </div>
                                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-primary" />
                            </Link>
                            <Link to="/users-management" className="flex items-center justify-between p-3 bg-brand-base/20 rounded-lg hover:bg-brand-base hover:text-brand-primary transition-colors group">
                                <div className="flex items-center">
                                    <Users className="w-5 h-5 text-gray-500 mr-3 group-hover:text-brand-primary" />
                                    <span className="font-medium text-gray-700 group-hover:text-brand-primary">Users</span>
                                </div>
                                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-primary" />
                            </Link>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

function StatCard({ icon, bg, label, value, desc }: { icon: any, bg: string, label: string, value: number, desc: string }) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 ${bg} rounded-lg`}>
                    {icon}
                </div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Stats</span>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
            <p className="text-sm text-gray-600">{desc}</p>
        </div>
    )
}
