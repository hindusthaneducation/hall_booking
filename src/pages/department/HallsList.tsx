import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Building2, Users, Maximize } from 'lucide-react';
import type { Database } from '../../types/database';

type Hall = Database['public']['Tables']['halls']['Row'];

export function HallsList() {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHalls();
  }, []);

  const fetchHalls = async () => {
    try {
      const { data, error } = await api.get<Hall[]>('/halls');

      if (error) throw error;
      if (data) setHalls(data);
    } catch (error) {
      console.error('Error fetching halls:', error);
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
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Browse Halls</h1>
        <p className="text-gray-600">Select a hall to view availability and make a booking</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {halls.map((hall) => (
          <Link
            key={hall.id}
            to={`/halls/${hall.id}`}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="aspect-video bg-gray-200 overflow-hidden">
              <img
                src={hall.image_url}
                alt={hall.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{hall.name}</h2>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{hall.description}</p>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center">
                  <Building2 className="w-4 h-4 mr-1" />
                  <span>{hall.hall_type}</span>
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  <span>{hall.seating_capacity} seats</span>
                </div>
              </div>
              {hall.stage_size && (
                <div className="flex items-center text-sm text-gray-600 mt-2">
                  <Maximize className="w-4 h-4 mr-1" />
                  <span>Stage: {hall.stage_size}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
