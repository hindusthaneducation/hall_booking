import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { User, Shield, Save, Lock, Mail } from 'lucide-react'; // Added Lock
import { SuccessModal } from '../../components/SuccessModal';

export function Settings() {
    const { profile } = useAuth();
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Password Change State
    const [passwords, setPasswords] = useState({
        old_password: '',
        new_password: '',
        confirm_password: ''
    });

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name);
        }
    }, [profile]);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await api.put(`/users/${profile?.id}`, {
                full_name: fullName,
                role: profile?.role,
                department_id: profile?.department_id
            });

            if (error) throw error;
            setShowSuccess(true);
        } catch (error) {
            console.error('Update failed:', error);
            alert('Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.new_password !== passwords.confirm_password) {
            alert('New passwords do not match');
            return;
        }
        setLoading(true);
        try {
            const { error } = await api.post('/auth/change-password', {
                old_password: passwords.old_password,
                new_password: passwords.new_password
            });
            if (error) {
                alert(typeof error === 'string' ? error : 'Failed to change password: Incorrect old password');
                throw error;
            }
            alert('Password changed successfully');
            setPasswords({ old_password: '', new_password: '', confirm_password: '' });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!profile) return null;

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            {/* Profile Section */}
            <div>
                <div className="mb-6">
                    <h1 className="text-3xl font-semibold text-gray-900 mb-2">Account Settings</h1>
                    <p className="text-gray-600">Manage your profile and security preferences</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                            <User className="w-5 h-5 mr-2 text-blue-600" />
                            Profile Information
                        </h2>
                    </div>

                    <form onSubmit={handleProfileUpdate} className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <div className="flex items-center text-gray-500 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                                <Mail className="w-4 h-4 mr-2" />
                                {profile.email}
                            </div>
                            <p className="mt-1 text-xs text-gray-500">Email cannot be changed directly.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <div className="flex items-center text-gray-500 bg-gray-50 px-3 py-2 rounded-md border border-gray-200 capitalize">
                                <Shield className="w-4 h-4 mr-2" />
                                {profile.role.replace('_', ' ')}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {loading ? 'Saving...' : 'Save Profile'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Password Change Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                        <Lock className="w-5 h-5 mr-2 text-blue-600" />
                        Change Password
                    </h2>
                </div>

                <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                        <input
                            type="password"
                            value={passwords.old_password}
                            onChange={(e) => setPasswords({ ...passwords, old_password: e.target.value })}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <input
                            type="password"
                            value={passwords.new_password}
                            onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                            required
                            minLength={6}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                        <input
                            type="password"
                            value={passwords.confirm_password}
                            onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                            required
                            minLength={6}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition-colors disabled:opacity-50"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>

            {showSuccess && (
                <SuccessModal
                    message="Profile updated successfully!"
                    onClose={() => setShowSuccess(false)}
                />
            )}
        </div>
    );
}
