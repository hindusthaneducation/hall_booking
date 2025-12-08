/*
  # Hall Booking Management System Schema

  1. New Tables
    - `departments`
      - `id` (uuid, primary key)
      - `name` (text) - Full department name
      - `short_name` (text) - Short name like IT, CSE, MBA
      - `created_at` (timestamptz)
    
    - `halls`
      - `id` (uuid, primary key)
      - `name` (text) - Hall name
      - `description` (text) - Short description
      - `image_url` (text) - Hall image URL
      - `stage_size` (text) - Stage dimensions
      - `seating_capacity` (integer)
      - `hall_type` (text) - theatre-style, auditorium, etc.
      - `is_active` (boolean) - For soft delete
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text)
      - `full_name` (text)
      - `role` (text) - department_user, principal, super_admin
      - `department_id` (uuid, references departments) - null for principal/admin
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `bookings`
      - `id` (uuid, primary key)
      - `hall_id` (uuid, references halls)
      - `department_id` (uuid, references departments)
      - `user_id` (uuid, references auth.users)
      - `booking_date` (date)
      - `event_title` (text)
      - `event_description` (text)
      - `event_time` (text) - Time range like "9:00 AM - 5:00 PM"
      - `approval_letter_url` (text) - URL to uploaded document
      - `status` (text) - pending, approved, rejected
      - `rejection_reason` (text) - Required when rejected
      - `approved_by` (uuid, references auth.users) - Principal who approved/rejected
      - `approved_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Policies for department users: view halls, create bookings, view own bookings
    - Policies for principal: view all bookings, approve/reject bookings
    - Policies for super admin: full access to all tables
*/

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Create halls table
CREATE TABLE IF NOT EXISTS halls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  image_url text DEFAULT '',
  stage_size text DEFAULT '',
  seating_capacity integer DEFAULT 0,
  hall_type text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE halls ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('department_user', 'principal', 'super_admin')),
  department_id uuid REFERENCES departments ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hall_id uuid NOT NULL REFERENCES halls ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  booking_date date NOT NULL,
  event_title text NOT NULL,
  event_description text DEFAULT '',
  event_time text NOT NULL,
  approval_letter_url text DEFAULT '',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text DEFAULT '',
  approved_by uuid REFERENCES auth.users ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(hall_id, booking_date, status)
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_hall_date ON bookings(hall_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_department ON bookings(department_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- RLS Policies for departments
CREATE POLICY "Anyone can view departments"
  ON departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admin can manage departments"
  ON departments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- RLS Policies for halls
CREATE POLICY "Anyone can view active halls"
  ON halls FOR SELECT
  TO authenticated
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('principal', 'super_admin')
  ));

CREATE POLICY "Super admin can manage halls"
  ON halls FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Super admin can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admin can manage profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- RLS Policies for bookings
CREATE POLICY "Department users can view own department bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('principal', 'super_admin')
    )
  );

CREATE POLICY "Department users can view all bookings for calendar"
  ON bookings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Department users can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'department_user'
      AND profiles.department_id = bookings.department_id
    )
  );

CREATE POLICY "Principal can update booking status"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'principal'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'principal'
    )
  );

CREATE POLICY "Super admin can manage all bookings"
  ON bookings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Insert initial departments
INSERT INTO departments (name, short_name) VALUES
  ('Information Technology', 'IT'),
  ('Computer Science Engineering', 'CSE'),
  ('Master of Business Administration', 'MBA'),
  ('Mechanical Engineering', 'MECH'),
  ('Electrical Engineering', 'EEE'),
  ('Civil Engineering', 'CIVIL')
ON CONFLICT (short_name) DO NOTHING;

-- Insert initial halls
INSERT INTO halls (name, description, image_url, stage_size, seating_capacity, hall_type) VALUES
  ('Bharathiar Hall', 'Large auditorium with modern facilities', 'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=1260', '40ft x 30ft', 500, 'Auditorium'),
  ('Chanakya Hall', 'Mid-sized hall perfect for seminars', 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=1260', '30ft x 25ft', 300, 'Theatre-style'),
  ('Ashoka Hall', 'Compact hall for workshops and meetings', 'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=1260', '25ft x 20ft', 150, 'Conference'),
  ('ABJ Hall', 'Multi-purpose hall with flexible seating', 'https://images.pexels.com/photos/2608517/pexels-photo-2608517.jpeg?auto=compress&cs=tinysrgb&w=1260', '35ft x 28ft', 250, 'Multi-purpose'),
  ('Open Auditorium', 'Large open-air venue for cultural events', 'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg?auto=compress&cs=tinysrgb&w=1260', '60ft x 50ft', 1000, 'Open-air')
ON CONFLICT DO NOTHING;

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'department_user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
