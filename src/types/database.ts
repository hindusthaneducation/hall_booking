export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      departments: {
        Row: {
          id: string;
          name: string;
          short_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          short_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          short_name?: string;
          created_at?: string;
        };
      };
      halls: {
        Row: {
          id: string;
          name: string;
          description: string;
          image_url: string;
          stage_size: string;
          seating_capacity: number;
          hall_type: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          image_url?: string;
          stage_size?: string;
          seating_capacity?: number;
          hall_type?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          image_url?: string;
          stage_size?: string;
          seating_capacity?: number;
          hall_type?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'department_user' | 'principal' | 'super_admin';
          department_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role: 'department_user' | 'principal' | 'super_admin';
          department_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'department_user' | 'principal' | 'super_admin';
          department_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          hall_id: string;
          department_id: string;
          user_id: string;
          booking_date: string;
          event_title: string;
          event_description: string;
          event_time: string;
          approval_letter_url: string;
          status: 'pending' | 'approved' | 'rejected';
          rejection_reason: string;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          hall_id: string;
          department_id: string;
          user_id: string;
          booking_date: string;
          event_title: string;
          event_description?: string;
          event_time: string;
          approval_letter_url?: string;
          status?: 'pending' | 'approved' | 'rejected';
          rejection_reason?: string;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          hall_id?: string;
          department_id?: string;
          user_id?: string;
          booking_date?: string;
          event_title?: string;
          event_description?: string;
          event_time?: string;
          approval_letter_url?: string;
          status?: 'pending' | 'approved' | 'rejected';
          rejection_reason?: string;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
