import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Database } from '../types/database';

// Using the same Profile type definition for compatibility
// Using the same Profile type definition for compatibility, extended with API fields
type Profile = Database['public']['Tables']['profiles']['Row'] & {
  institution?: {
    name: string;
    short_name: string;
  };
  department?: {
    name: string;
    short_name: string;
  };
};

interface AuthContextType {
  user: { id: string; email?: string } | null; // Simplified User object
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // We'll store basic user info in 'user' and full profile in 'profile'
  // In the new API, they are similar, but we keep the distinction for now to minimize refactoring
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const { data, error } = await api.get<{ user: Profile }>('/auth/me');
        if (data && data.user) {
          setProfile(data.user);
          setUser({ id: data.user.id, email: data.user.email });
        } else {
          // Token might be invalid
          localStorage.removeItem('token');
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('Session check failed', err);
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await api.post<{ token: string; user: Profile }>('/auth/login', {
      email,
      password,
    });

    if (error) {
      return { error };
    }

    if (data) {
      localStorage.setItem('token', data.token);
      setProfile(data.user);
      setUser({ id: data.user.id, email: data.user.email });
      return { error: null };
    }

    return { error: new Error('Login failed') };
  };

  const signOut = async () => {
    localStorage.removeItem('token');
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
