import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { UserPlus } from 'lucide-react';
import HindusthanLogo from '../images/hindusthan_logo.webp';
import type { Database } from '../types/database';

type Department = Database['public']['Tables']['departments']['Row'];

export function Register() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        role: 'department_user' as const,
        department_id: '',
    });
    const [departments, setDepartments] = useState<Department[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        checkRegistrationStatus();
        fetchDepartments();
    }, []);

    const checkRegistrationStatus = async () => {
        try {
            const { data } = await api.get<{ value: boolean }>('/settings/registration_active');
            // If data exists, use value. Default to true if not set.
            if (data) {
                setIsRegistrationOpen(data.value);
            }
        } catch (error) {
            console.error('Failed to check registration status', error);
        } finally {
            setCheckingStatus(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const { data } = await api.get<Department[]>('/departments');
            if (data) {
                setDepartments(data);
                // Set default department if available
                if (data.length > 0) {
                    setFormData(prev => ({ ...prev, department_id: data[0].id }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch departments', error);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error: apiError } = await api.post('/auth/register', formData);

            if (apiError) {
                throw new Error(apiError.message);
            }

            // Success - navigate to login
            navigate('/login');
        } catch (err: any) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="min-h-screen bg-brand-base flex items-center justify-center px-4 py-12">
            <div className="max-w-md w-full">
                <div className="bg-brand-card rounded-lg shadow-sm border border-gray-200 p-8">
                    <div className="flex items-center justify-center mb-8">
                        <img src={HindusthanLogo} alt="Logo" className="w-12 h-12 object-contain mr-3" />
                        <h1 className="text-2xl font-semibold text-gray-900">Hall Booking System</h1>
                    </div>

                    {checkingStatus ? (
                        <div className="text-center py-8">Loading...</div>
                    ) : !isRegistrationOpen ? (
                        <div className="text-center py-8">
                            <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg mb-6">
                                <h3 className="text-lg font-medium mb-2">Registration Closed</h3>
                                <p className="text-sm">New user registration is currently disabled by the administrator.</p>
                            </div>
                            <p className="text-gray-600 mb-6">
                                Please contact the System Administrator to create an account for you.
                            </p>
                            <Link to="/login" className="text-brand-primary font-medium hover:text-brand-secondary">
                                Return to Login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-xl font-medium text-gray-900 mb-6 text-center">
                                Create an account
                            </h2>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                                        Full Name
                                    </label>
                                    <input
                                        id="full_name"
                                        name="full_name"
                                        type="text"
                                        value={formData.full_name}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter your full name"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                        Email address
                                    </label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter your email"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                        Password
                                    </label>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Create a password"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                                        Role
                                    </label>
                                    <select
                                        id="role"
                                        name="role"
                                        value={formData.role}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="department_user">Department User</option>
                                        <option value="principal">Principal</option>
                                        {/* super_admin should not be selectable typically, but keeping it simple */}
                                    </select>
                                </div>

                                {formData.role === 'department_user' && (
                                    <div>
                                        <label htmlFor="department_id" className="block text-sm font-medium text-gray-700 mb-1">
                                            Department
                                        </label>
                                        <select
                                            id="department_id"
                                            name="department_id"
                                            value={formData.department_id}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                                        >
                                            <option value="">Select a Department</option>
                                            {departments.map((dept) => (
                                                <option key={dept.id} value={dept.id}>
                                                    {dept.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-2.5 px-4 bg-brand-primary hover:bg-brand-secondary text-white font-medium rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                >
                                    <UserPlus className="w-5 h-5 mr-2" />
                                    {loading ? 'Creating account...' : 'Create Account'}
                                </button>
                            </form>
                        </>
                    )}

                    <div className="text-center mt-6">
                        <p className="text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link to="/login" className="text-brand-secondary hover:text-brand-primary font-medium">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
