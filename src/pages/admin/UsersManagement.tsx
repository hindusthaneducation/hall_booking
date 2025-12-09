import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Users, Plus, Edit, X, Trash2 } from 'lucide-react';
import type { Database } from '../../types/database';
import type { Institution } from '../../lib/types';

type Profile = Database['public']['Tables']['profiles']['Row'] & {
  department?: Database['public']['Tables']['departments']['Row'];
  institution_id?: string; // Add this
};
type Department = Database['public']['Tables']['departments']['Row'];

export function UsersManagement() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
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
      console.error('Error saving user:', error);
      alert('Failed to save user');
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

  const resetForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      full_name: '',
      role: 'department_user',
      department_id: '',
      institution_id: '',
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Manage Users</h1>
          <p className="text-gray-600">Create and manage user accounts</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add User
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institution</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dept</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => {
              // Find inst name
              const instName = institutions.find(i => i.id === user.institution_id)?.name || '-';
              return (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{user.full_name}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-600">{user.email}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 truncate max-w-xs" title={instName}>{instName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.department?.short_name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEdit(user)} className="text-blue-600 hover:text-blue-900 mr-3"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">{editingUser ? 'Edit User' : 'Add New User'}</h2>
              <button onClick={resetForm}><X className="w-5 h-5 text-gray-600" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

              {/* Institution Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
                <select value={formData.institution_id} onChange={(e) => setFormData({ ...formData, institution_id: e.target.value })} required className="w-full px-3 py-2 border rounded-md">
                  <option value="">Select Institution</option>
                  {institutions.map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </select>
              </div>

              {/* Department Selection - dependent on Institution? Ideally yes, but for now showing all or filtered */}
              {formData.role === 'department_user' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select value={formData.department_id} onChange={(e) => setFormData({ ...formData, department_id: e.target.value })} required className="w-full px-3 py-2 border rounded-md">
                    <option value="">Select Department</option>
                    {departments
                      .filter(d => !formData.institution_id || d.institution_id === formData.institution_id) // Filter by selected inst
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
      )}
    </div>
  );
}
