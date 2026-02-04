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
      institutions: {
        Row: {
          id: string;
          name: string;
          short_name: string;
          logo_url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          short_name?: string;
          logo_url?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          short_name?: string;
          logo_url?: string;
          created_at?: string;
        };
      };
      departments: {
        Row: {
          id: string;
          name: string;
          short_name: string;
          institution_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          short_name: string;
          institution_id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          short_name?: string;
          institution_id?: string;
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
          is_ac: boolean;
          has_sound_system: boolean;
          institution_id: string;
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
          institution_id?: string;
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
          institution_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'department_user' | 'principal' | 'super_admin' | 'designing_team' | 'photography_team' | 'press_release_team';
          department_id: string | null;
          institution_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role: 'department_user' | 'principal' | 'super_admin' | 'designing_team' | 'photography_team' | 'press_release_team';
          department_id?: string | null;
          institution_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'department_user' | 'principal' | 'super_admin' | 'designing_team' | 'photography_team' | 'press_release_team';
          department_id?: string | null;
          institution_id?: string | null;
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
          is_ac: boolean;
          is_fan: boolean;
          is_photography: boolean;
          media_coordinator_name: string | null;
          contact_no: string | null;
          chief_guest_name: string | null;
          chief_guest_designation: string | null;
          chief_guest_organization: string | null;
          chief_guest_photo_url: string | null;
          event_partner_organization: string | null;
          event_partner_details: string | null;
          event_partner_logo_url: string | null;
          event_coordinator_name: string | null;
          event_convenor_details: string | null;
          in_house_guest: string | null;
          work_status: 'pending' | 'completed';
          final_file_url: string | null;
          files_urls: string[] | null;
          photography_drive_link: string | null;
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
          is_ac?: boolean;
          is_fan?: boolean;
          is_photography?: boolean;
          media_coordinator_name?: string | null;
          contact_no?: string | null;
          chief_guest_name?: string | null;
          chief_guest_designation?: string | null;
          chief_guest_organization?: string | null;
          chief_guest_photo_url?: string | null;
          event_partner_organization?: string | null;
          event_partner_details?: string | null;
          event_partner_logo_url?: string | null;
          event_coordinator_name?: string | null;
          event_convenor_details?: string | null;
          in_house_guest?: string | null;
          work_status?: 'pending' | 'completed';
          final_file_url?: string | null;
          files_urls?: string[] | null;
          photography_drive_link?: string | null;
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
          is_ac?: boolean;
          is_fan?: boolean;
          is_photography?: boolean;
          media_coordinator_name?: string | null;
          contact_no?: string | null;
          chief_guest_name?: string | null;
          chief_guest_designation?: string | null;
          chief_guest_organization?: string | null;
          chief_guest_photo_url?: string | null;
          event_partner_organization?: string | null;
          event_partner_details?: string | null;
          event_partner_logo_url?: string | null;
          event_coordinator_name?: string | null;
          event_convenor_details?: string | null;
          in_house_guest?: string | null;
          work_status?: 'pending' | 'completed';
          final_file_url?: string | null;
          files_urls?: string[] | null;
          photography_drive_link?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
