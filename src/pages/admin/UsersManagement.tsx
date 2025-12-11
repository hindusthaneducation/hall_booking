import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Users, Plus, Edit, X, Trash2, ArrowLeft, Search, GraduationCap } from 'lucide-react';
import type { Database } from '../../types/database';
import type { Institution } from '../../lib/types';
import HindusthanLogo from '../../images/hindusthan_logo.webp';
import { ImageWithFallback } from '../../components/ImageWithFallback';

type Profile = Database['public']['Tables']['profiles']['Row'] & {
  department?: Database['public']['Tables']['departments']['Row'];
  institution_id?: string;
};
type Department = Database['public']['Tables']['departments']['Row'];

export function UsersManagement() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);

  // View State
  const [selectedInstId, setSelectedInstId] = useState<string | null>(null); // 'system' or uuid or null
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'department_user' as 'department_user' | 'principal' | 'super_admin',
    department_id: '',
    institution_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, departmentsRes, institutionsRes] = await Promise.all([
        api.get<Profile[]>('/users'),
        api.get<Department[]>('/departments'),
        api.get<Institution[]>('/institutions'),
      ]);

      if (usersRes.data) setUsers(usersRes.data);
      if (departmentsRes.data) setDepartments(departmentsRes.data);
      if (institutionsRes.data) setInstitutions(institutionsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role,
        department_id: formData.department_id || null,
        institution_id: formData.institution_id || null,
        password: formData.password,
      };

      if (editingUser) {
        const { error } = await api.put(`/users/${editingUser.id}`, payload);
        if (error) throw error;
      } else {
        const { error } = await api.post('/auth/register', payload);
        if (error) throw error;
      }
      resetForm();
      fetchData();
    } catch (error) {
      alert('Failed to save user');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const { error } = await api.delete(`/users/${id}`);
      if (error) throw error;
      fetchData();
    } catch (error) {
      alert('Failed to delete user');
    }
  };

  const handleEdit = (user: Profile) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      full_name: user.full_name,
      role: user.role,
      department_id: user.department_id || '',
      institution_id: user.institution_id || '',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      full_name: '',
      role: 'department_user',
      department_id: '',
      institution_id: selectedInstId && selectedInstId !== 'system' ? selectedInstId : '',
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-700';
      case 'principal': return 'bg-blue-100 text-blue-700';
      default: return 'bg-green-100 text-green-700';
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  // --- View Logic ---

  if (selectedInstId) {
    const isSystem = selectedInstId === 'system';
    const institution = !isSystem ? institutions.find(i => i.id === selectedInstId) : { name: 'Hindusthan Educational Institutions' };

    // Filter by Institution/System
    let filteredUsers = users.filter(u => isSystem ? !u.institution_id : u.institution_id === selectedInstId);

    // Get Counts
    const hodCount = filteredUsers.filter(u => u.role === 'department_user').length;
    const principalCount = filteredUsers.filter(u => u.role === 'principal').length;
    const superAdminCount = filteredUsers.filter(u => u.role === 'super_admin').length;

    // Apply Search
    if (searchQuery) {
      filteredUsers = filteredUsers.filter(u =>
        u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort: Principal first, then others
    filteredUsers.sort((a, b) => {
      if (a.role === 'principal' && b.role !== 'principal') return -1;
      if (a.role !== 'principal' && b.role === 'principal') return 1;
      return 0;
    });

    return (
      <div>
        <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
          <div className="flex items-start space-x-4">
            <button onClick={() => { setSelectedInstId(null); setSearchQuery(''); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors mt-1">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center mb-2">
                <ImageWithFallback
                  src={!isSystem ? institution?.logo_url : null}
                  alt={institution?.name || 'Logo'}
                  className="w-8 h-8 object-contain mr-2"
                />
                {institution?.name}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 ml-8">
                {!isSystem ? (
                  <>
                    <span className="flex items-center px-3 py-1 bg-gray-100 rounded-full">
                      <Users className="w-4 h-4 mr-2 text-gray-500" />
                      {filteredUsers.length} Users Total
                    </span>
                    <span className="flex items-center px-3 py-1 bg-green-50 text-green-700 rounded-full">
                      <Users className="w-4 h-4 mr-2" />
                      {hodCount} HODs
                    </span>
                    <span className="flex items-center px-3 py-1 bg-purple-50 text-purple-700 rounded-full">
                      <GraduationCap className="w-4 h-4 mr-2" />
                      {principalCount} Principals
                    </span>
                  </>
                ) : (
                  <span className="flex items-center px-3 py-1 bg-purple-50 text-purple-700 rounded-full">
                    <Shield className="w-4 h-4 mr-2" />
                    {superAdminCount} System Admins
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 shadow-sm"
              />
              <div className="absolute left-3 top-2.5 text-gray-400">
                <Search className="w-4 h-4" />
              </div>
            </div>

            <button
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  institution_id: !isSystem && selectedInstId ? selectedInstId : '',
                  role: isSystem ? 'super_admin' : 'department_user'
                }));
                setShowForm(true);
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add User
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dept</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                    {user.role === 'principal' && <span className="text-xs text-blue-600 font-semibold">Principal</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-600">{user.email}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.department?.short_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEdit(user)} className="text-blue-600 hover:text-blue-900 mr-3"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    {searchQuery ? `No users found matching "${searchQuery}".` : 'No users found for this group.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {renderForm(showForm, editingUser, formData, setFormData, handleSubmit, resetForm, departments, institutions, selectedInstId)}
      </div>
    );
  }

  // Grid View
  const systemUsersCount = users.filter(u => !u.institution_id).length;
  // Filter Institutions by Search
  const filteredInstitutions = institutions.filter(inst =>
    inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inst.short_name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  // Also filter System Card logic: if search matches "hindusthan", "system", "super admin", etc.
  const showSystemCard = searchQuery === '' ||
    'hindusthan educational institutions'.includes(searchQuery.toLowerCase()) ||
    'super admins'.includes(searchQuery.toLowerCase()) ||
    'system'.includes(searchQuery.toLowerCase());

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Manage Users</h1>
          <p className="text-gray-600">Select an institution to manage its staff</p>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search colleges or system..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 shadow-sm"
          />
          <div className="absolute left-3 top-2.5 text-gray-400">
            <Search className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* System Admins Card */}
        {showSystemCard && (
          <div
            onClick={() => { setSelectedInstId('system'); setSearchQuery(''); }}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center text-center group"
          >
            <div className="p-4 bg-purple-50 rounded-full mb-4 group-hover:bg-purple-100 transition-colors">
              <ImageWithFallback src={null} fallbackSrc={HindusthanLogo} alt="System Logo" className="w-8 h-8 object-contain" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Hindusthan Educational Institutions</h3>
            <p className="text-sm text-gray-500">Super Admins / System</p>
            <div className="mt-4 px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
              {systemUsersCount} Users
            </div>
          </div>
        )}

        {/* Institution Cards */}
        {filteredInstitutions.map(inst => {
          const count = users.filter(u => u.institution_id === inst.id).length;
          return (
            <div
              key={inst.id}
              onClick={() => { setSelectedInstId(inst.id); setSearchQuery(''); }}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center text-center group"
            >
              <div className="h-16 w-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4 overflow-hidden">
                <ImageWithFallback
                  src={inst.logo_url}
                  alt={inst.name}
                  className="h-10 w-10 object-contain"
                />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{inst.name}</h3>
              <p className="text-sm text-gray-500">{inst.short_name}</p>
              <div className="mt-4 px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                {count} Users
              </div>
            </div>
          )
        })}
        {filteredInstitutions.length === 0 && !showSystemCard && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No institutions found matching "{searchQuery}".
          </div>
        )}
      </div>

      <div className="fixed bottom-8 right-8">
        <button
          onClick={() => {
            setFormData(prev => ({ ...prev, institution_id: '', role: 'department_user' }));
            setShowForm(true);
          }}
          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-transform transform hover:-translate-y-1"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add User
        </button>
      </div>

      {renderForm(showForm, editingUser, formData, setFormData, handleSubmit, resetForm, departments, institutions, null)}
    </div>
  );
}

function renderForm(showForm: boolean, editingUser: any, formData: any, setFormData: any, handleSubmit: any, resetForm: any, departments: Department[], institutions: Institution[], lockedInstId: string | null) {
  if (!showForm) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">{editingUser ? 'Edit User' : 'Add New User'}</h2>
          <button onClick={resetForm}><X className="w-5 h-5 text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} required className="w-full px-3 py-2 border rounded-md" />
          </div>

          {!editingUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="w-full px-3 py-2 border rounded-md" />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{editingUser ? 'New Password' : 'Password'}</label>
            <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required={!editingUser} className="w-full px-3 py-2 border rounded-md" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as any })} className="w-full px-3 py-2 border rounded-md">
              <option value="department_user">Department User</option>
              <option value="principal">Principal</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
            <select
              value={formData.institution_id}
              onChange={(e) => setFormData({ ...formData, institution_id: e.target.value })}
              required={formData.role !== 'super_admin'}
              disabled={!!lockedInstId}
              className={`w-full px-3 py-2 border rounded-md ${lockedInstId ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
            >
              <option value="">Select Institution</option>
              {institutions.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>
          </div>

          {formData.role === 'department_user' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select value={formData.department_id} onChange={(e) => setFormData({ ...formData, department_id: e.target.value })} required className="w-full px-3 py-2 border rounded-md">
                <option value="">Select Department</option>
                {departments
                  .filter(d => !formData.institution_id || d.institution_id === formData.institution_id)
                  .map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
              </select>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={resetForm} className="px-4 py-2 border rounded-md">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">{editingUser ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
