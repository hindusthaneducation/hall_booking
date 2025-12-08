# Demo Credentials

Use these credentials to test different user roles in the Hall Booking Management System.

## Department User (IT Department)
- **Email:** it.user@college.edu
- **Password:** demo123
- **Role:** Department User
- **Department:** Information Technology

## Principal
- **Email:** principal@college.edu
- **Password:** demo123
- **Role:** Principal
- **Access:** Can approve/reject booking requests

## Super Admin
- **Email:** admin@college.edu
- **Password:** demo123
- **Role:** Super Admin
- **Access:** Full system access including user and hall management

---

## Creating Demo Users

To create these demo users, you can use the Super Admin interface at `/users-management` or create them manually using the Supabase Auth API.

### Option 1: Using the Application
1. First create a super admin account manually
2. Log in as super admin
3. Navigate to Users Management
4. Create the other demo accounts

### Option 2: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to Authentication > Users
3. Click "Add user" and create each account with the credentials above
4. Make sure to set the appropriate metadata for role and department
