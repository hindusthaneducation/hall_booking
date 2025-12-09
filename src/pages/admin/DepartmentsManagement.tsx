import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Plus, Edit, Trash2, X, Layers } from 'lucide-react';
import type { Department, Institution } from '../../lib/types';

export function DepartmentsManagement() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<Department | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        short_name: '',
        institution_id: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [deptRes, instRes] = await Promise.all([
                api.get<Department[]>('/departments'),
                api.get<Institution[]>('/institutions'),
            ]);

            if (deptRes.data) setDepartments(deptRes.data);
            if (instRes.data) setInstitutions(instRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingItem) {
                const { error } = await api.put(`/departments/${editingItem.id}`, formData);
                if (error) throw error;
            } else {
                const { error } = await api.post('/departments', formData);
                if (error) throw error;
            }
            resetForm();
            fetchData();
        } catch (error) {
            alert('Failed to save department');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            const { error } = await api.delete(`/departments/${id}`);
            if (error) throw error;
            fetchData();
        } catch (error) {
            alert('Failed to delete department');
        }
    };

    const handleEdit = (item: Department) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            short_name: item.short_name,
            institution_id: item.institution_id || '',
        });
        setShowForm(true);
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingItem(null);
        setFormData({ name: '', short_name: '', institution_id: '' });
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-semibold text-gray-900 mb-2">Manage Departments</h1>
                    <p className="text-gray-600">Add or edit Departments</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Department
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institution</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {departments.map((item) => {
                            const instName = institutions.find(i => i.id === item.institution_id)?.name || '-';
                            return (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{item.name}</div></td>
                                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-600">{item.short_name}</div></td>
                                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-600 truncate max-w-xs" title={instName}>{instName}</div></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-900 mr-3"><Edit className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="p-6 border-b border-gray-200 flex justify-between">
                            <h2 className="text-2xl font-semibold text-gray-900">{editingItem ? 'Edit Department' : 'Add Department'}</h2>
                            <button onClick={resetForm}><X className="w-5 h-5 text-gray-600" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
                                <select value={formData.institution_id} onChange={(e) => setFormData({ ...formData, institution_id: e.target.value })} required className="w-full px-3 py-2 border rounded-md">
                                    <option value="">Select Institution</option>
                                    {institutions.map(inst => (
                                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department Name</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-3 py-2 border rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Short Code (e.g. CSE)</label>
                                <input type="text" value={formData.short_name} onChange={(e) => setFormData({ ...formData, short_name: e.target.value })} required className="w-full px-3 py-2 border rounded-md" />
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={resetForm} className="px-4 py-2 border rounded-md">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
