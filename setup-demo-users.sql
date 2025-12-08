/*
  Demo User Setup Script

  This script helps you create demo user accounts for testing the Hall Booking Management System.

  IMPORTANT: This is for demonstration purposes only.
  In production, users should be created through the Super Admin interface.

  To use this script:
  1. Go to your Supabase project dashboard
  2. Navigate to SQL Editor
  3. Create a new query
  4. Paste and run this script

  Note: This script only creates profile entries. You'll need to create the actual
  auth users through the Supabase Dashboard or programmatically using the Auth API.
*/

-- First, get the department IDs (IT department for demo user)
DO $$
DECLARE
  it_dept_id UUID;
BEGIN
  SELECT id INTO it_dept_id FROM departments WHERE short_name = 'IT' LIMIT 1;

  -- Display department ID for reference
  RAISE NOTICE 'IT Department ID: %', it_dept_id;
END $$;

-- Instructions for creating demo users:
/*
  1. Create Super Admin User:
     - Go to Supabase Dashboard > Authentication > Users > Add User
     - Email: admin@college.edu
     - Password: demo123
     - In the user metadata, add:
       {
         "full_name": "System Administrator",
         "role": "super_admin"
       }

  2. Create Principal User:
     - Email: principal@college.edu
     - Password: demo123
     - User metadata:
       {
         "full_name": "Dr. Principal",
         "role": "principal"
       }

  3. Create Department User (IT):
     - Email: it.user@college.edu
     - Password: demo123
     - User metadata:
       {
         "full_name": "IT Department User",
         "role": "department_user"
       }
     - After creating the user, update their profile to link to IT department:
       UPDATE profiles
       SET department_id = (SELECT id FROM departments WHERE short_name = 'IT')
       WHERE email = 'it.user@college.edu';

  4. Create Another Department User (CSE):
     - Email: cse.user@college.edu
     - Password: demo123
     - User metadata:
       {
         "full_name": "CSE Department User",
         "role": "department_user"
       }
     - Update profile:
       UPDATE profiles
       SET department_id = (SELECT id FROM departments WHERE short_name = 'CSE')
       WHERE email = 'cse.user@college.edu';
*/

-- Verify demo users (run after creating them)
SELECT
  p.full_name,
  p.email,
  p.role,
  d.short_name as department
FROM profiles p
LEFT JOIN departments d ON p.department_id = d.id
ORDER BY
  CASE p.role
    WHEN 'super_admin' THEN 1
    WHEN 'principal' THEN 2
    WHEN 'department_user' THEN 3
    ELSE 4
  END,
  p.full_name;
