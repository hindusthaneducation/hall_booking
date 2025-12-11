import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Plus, Edit, Trash2, X, Search, ArrowLeft, School, FolderTree, GraduationCap, Users } from 'lucide-react';
import type { Department, Institution, User } from '../../lib/types';

import { ImageWithFallback } from '../../components/ImageWithFallback';

type Profile = User; // Alias for convenience if needed, or just use User

export function DepartmentsManagement() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    // View State
    const [selectedInstId, setSelectedInstId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Form State
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
            const [deptRes, instRes, usersRes] = await Promise.all([
                api.get<Department[]>('/departments'),
                api.get<Institution[]>('/institutions'),
                api.get<Profile[]>('/users'),
            ]);

            if (deptRes.data) setDepartments(deptRes.data);
            if (instRes.data) setInstitutions(instRes.data);
            if (usersRes.data) setUsers(usersRes.data);
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
            console.error('Error saving department:', error);
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
        setFormData({
            name: '',
            short_name: '',
            institution_id: selectedInstId || ''
        });
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    // --- View Logic ---
    if (selectedInstId) {
        const institution = institutions.find(i => i.id === selectedInstId);
        const filteredDepts = departments
            .filter(d => d.institution_id === selectedInstId)
            .filter(d =>
                d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                d.short_name.toLowerCase().includes(searchQuery.toLowerCase())
            );

        // Calculate Counts
        const instUsers = users.filter(u => u.institution_id === selectedInstId);
        const hodCount = instUsers.filter(u => u.role === 'department_user').length;
        const principalCount = instUsers.filter(u => u.role === 'principal').length;

        if (!institution) return <div className="p-8">Institution not found. <button onClick={() => setSelectedInstId(null)}>Back</button></div>;

        return (
            <div>
                <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
                    <div className="flex items-start space-x-4 w-full md:w-auto">
                        <button onClick={() => { setSelectedInstId(null); setSearchQuery(''); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors mt-1 shrink-0">
                            <ArrowLeft className="w-6 h-6 text-gray-600" />
                        </button>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center mb-2 flex-wrap">
                                <School className="w-6 h-6 mr-2 text-indigo-600 shrink-0" />
                                <span className="break-words">{institution.name}</span>
                            </h1>
                            <div className="flex flex-wrap gap-2 md:gap-4 text-sm text-gray-600 md:ml-8">
                                <span className="flex items-center px-3 py-1 bg-gray-100 rounded-full whitespace-nowrap">
                                    <FolderTree className="w-4 h-4 mr-2 text-gray-500" />
                                    {filteredDepts.length} Departments
                                </span>
                                <span className="flex items-center px-3 py-1 bg-green-50 text-green-700 rounded-full whitespace-nowrap">
                                    <Users className="w-4 h-4 mr-2" />
                                    {hodCount} HODs
                                </span>
                                <span className="flex items-center px-3 py-1 bg-purple-50 text-purple-700 rounded-full whitespace-nowrap">
                                    <GraduationCap className="w-4 h-4 mr-2" />
                                    {principalCount} Principals
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 sm:flex-initial">
                            <input
                                type="text"
                                placeholder="Search departments..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 shadow-sm"
                            />
                            <div className="absolute left-3 top-2.5 text-gray-400">
                                <Search className="w-4 h-4" />
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setFormData(prev => ({ ...prev, institution_id: selectedInstId }));
                                setShowForm(true);
                            }}
                            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Add Department
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredDepts.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{item.name}</div></td>
                                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-600">{item.short_name}</div></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-900 mr-3"><Edit className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                            {filteredDepts.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                                        {searchQuery ? `No departments found matching "${searchQuery}"` : 'No departments found.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {renderForm(showForm, editingItem, formData, setFormData, handleSubmit, resetForm, institutions, selectedInstId)}
            </div>
        );
    }

    // Grid View
    const filteredInstitutions = institutions.filter(inst =>
        inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inst.short_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-semibold text-gray-900 mb-2">Manage Departments</h1>
                    <p className="text-gray-600">Select an institution to manage its departments</p>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search colleges..."
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
                {filteredInstitutions.map(inst => {
                    const deptCount = departments.filter(d => d.institution_id === inst.id).length;

                    return (
                        <div
                            key={inst.id}
                            onClick={() => { setSelectedInstId(inst.id); setSearchQuery(''); }}
                            className="bg-brand-card rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow text-center flex flex-col items-center"
                        >
                            <div className="h-16 w-16 bg-brand-base/20 rounded-full flex items-center justify-center mb-4 overflow-hidden">
                                <ImageWithFallback
                                    src={inst.logo_url}
                                    alt={inst.name}
                                    className="h-10 w-10 object-contain"
                                />
                            </div>
                            <h3 className="text-lg font-semibold text-brand-text mb-1">{inst.name}</h3>
                            <p className="text-sm text-gray-500 mb-4">{inst.short_name}</p>
                            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {deptCount} Departments
                            </div>
                        </div>
                    );
                })}
                {filteredInstitutions.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        No institutions found matching "{searchQuery}".
                    </div>
                )}
            </div>

            <div className="fixed bottom-8 right-8">
                <button
                    onClick={() => {
                        setFormData(prev => ({ ...prev, institution_id: '' }));
                        setShowForm(true);
                    }}
                    className="flex items-center px-6 py-3 bg-brand-primary text-white rounded-full shadow-lg hover:bg-brand-secondary transition-transform transform hover:-translate-y-1"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Dept
                </button>
            </div>

            {renderForm(showForm, editingItem, formData, setFormData, handleSubmit, resetForm, institutions, null)}
        </div>
    );
}

function renderForm(showForm: boolean, editingItem: any, formData: any, setFormData: any, handleSubmit: any, resetForm: any, institutions: Institution[], lockedInstId: string | null) {
    if (!showForm) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6 border-b border-gray-200 flex justify-between">
                    <h2 className="text-2xl font-semibold text-gray-900">{editingItem ? 'Edit Department' : 'Add Department'}</h2>
                    <button onClick={resetForm}><X className="w-5 h-5 text-gray-600" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
                        <select
                            value={formData.institution_id}
                            onChange={(e) => setFormData({ ...formData, institution_id: e.target.value })}
                            required
                            disabled={!!lockedInstId}
                            className={`w - full px - 3 py - 2 border rounded - md ${lockedInstId ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''} `}
                        >
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
    );
}
