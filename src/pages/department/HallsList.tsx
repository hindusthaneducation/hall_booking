import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Building2, Users, School, MapPin, ArrowRight, ArrowLeft } from 'lucide-react';
import type { Database } from '../../types/database';
import type { Institution } from '../../lib/types';

type Hall = Database['public']['Tables']['halls']['Row'];

export function HallsList() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [halls, setHalls] = useState<Hall[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation / View State
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedInstId, setSelectedInstId] = useState<string | null>(searchParams.get('institution_id'));
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Sync URL state to local state
    const id = searchParams.get('institution_id');
    setSelectedInstId(id);
  }, [searchParams]);

  const fetchData = async () => {
    try {
      const [hallsRes, instRes] = await Promise.all([
        api.get<Hall[]>('/halls'),
        api.get<Institution[]>('/institutions'),
      ]);

      if (hallsRes.data) setHalls(hallsRes.data);
      if (instRes.data) setInstitutions(instRes.data);
    } catch (error) {
      console.error('Error fetching halls:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInstitution = (id: string) => {
    setSearchParams({ institution_id: id });
    setSelectedInstId(id);
    setSearchQuery('');
  };

  const handleBackToGrid = () => {
    setSearchParams({});
    setSelectedInstId(null);
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // --- Access Control Logic ---
  // If Super Admin: See ALL institutions.
  // If Principal/Dept User: See ONLY their own institution.
  const visibleInstitutions = profile?.role === 'super_admin'
    ? institutions
    : institutions.filter(inst => inst.id === profile?.institution_id);

  // --- View Logic ---

  // 1. Detail View (Selected Institution)
  if (selectedInstId) {
    const institution = institutions.find(i => i.id === selectedInstId);

    // Security check: If not super admin, ensure selected ID matches own ID
    if (profile?.role !== 'super_admin' && selectedInstId !== profile?.institution_id) {
      return (
        <div className="p-8 text-center text-red-600">
          <h2 className="text-xl font-bold">Unauthorized Access</h2>
          <p>You do not have permission to view this institution's halls.</p>
          <button onClick={handleBackToGrid} className="mt-4 text-blue-600 underline">Return to Dashboard</button>
        </div>
      );
    }

    const filteredHalls = halls
      .filter(h => h.institution_id === selectedInstId)
      .filter(h =>
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.hall_type.toLowerCase().includes(searchQuery.toLowerCase())
      );

    if (!institution) return <div className="p-8">Institution not found. <button onClick={handleBackToGrid}>Back</button></div>;

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center space-x-4">
            <button onClick={handleBackToGrid} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <School className="w-8 h-8 mr-3 text-indigo-600" />
                {institution.name}
              </h1>
              <p className="text-gray-500 mt-1 ml-11">Browse available halls and facilities</p>
            </div>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search halls..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHalls.map((hall) => (
            <div
              key={hall.id}
              onClick={() => navigate(`/halls/${hall.id}`)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer"
            >
              <div className="aspect-video w-full relative overflow-hidden bg-gray-100">
                {hall.image_url ? (
                  <img
                    src={hall.image_url.startsWith('http') ? hall.image_url : `${import.meta.env.VITE_API_BASE_URL}${hall.image_url}`}
                    alt={hall.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&q=80&w=800';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-indigo-600 shadow-sm">
                  {hall.hall_type}
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                  {hall.name}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {hall.description || 'No description available'}
                </p>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="w-4 h-4 mr-3 text-gray-400" />
                    <span>Capacity: <span className="font-medium text-gray-900">{hall.seating_capacity} Seats</span></span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPin className="w-4 h-4 mr-3 text-gray-400" />
                    <span>Stage: <span className="font-medium text-gray-900">{hall.stage_size || 'Standard'}</span></span>
                  </div>
                </div>

                <div className="block w-full py-2.5 px-4 bg-gray-50 text-indigo-600 font-medium rounded-lg text-center hover:bg-indigo-50 transition-colors border border-indigo-100">
                  View Details & Book
                </div>
              </div>
            </div>
          ))}

          {filteredHalls.length === 0 && (
            <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No halls found</h3>
              <p className="text-gray-500">Try adjusting your search terms</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Main Grid View (Institutions)
  const filteredInstitutions = visibleInstitutions.filter(inst =>
    inst.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Browse Halls</h1>
          <p className="text-gray-600 mt-1">Select an institution to view available halls</p>
        </div>

        {/* Only show Institution Search if Super Admin (or if multiple insts somehow) */}
        {profile?.role === 'super_admin' && (
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search colleges..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInstitutions.map((inst) => {
          const hallCount = halls.filter(h => h.institution_id === inst.id).length;
          return (
            <div
              key={inst.id}
              onClick={() => handleSelectInstitution(inst.id)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md hover:border-indigo-100 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                  <School className="w-8 h-8 text-indigo-600" />
                </div>
                <div className="bg-gray-100 px-3 py-1 rounded-full text-xs font-medium text-gray-600">
                  {hallCount} Halls
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                {inst.name}
              </h3>
              <p className="text-sm text-gray-500 flex items-center">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                Available for Booking
              </p>
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center text-indigo-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                View Halls <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </div>
          );
        })}

        {filteredInstitutions.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <School className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No institutions found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
