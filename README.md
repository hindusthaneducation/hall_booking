# Hall Booking Management System

A production-ready, responsive web application for managing college hall bookings with role-based access control.

## Features

### For Department Users
- Browse available halls with detailed information
- View hall availability using an interactive calendar
- Create booking requests with document uploads
- Track booking status (pending, approved, rejected)
- View booking history and rejection reasons

### For Principal
- Dashboard with booking statistics
- Review pending booking requests
- Approve or reject bookings with optional rejection reasons
- View complete booking history across all halls
- Access uploaded approval documents

### For Super Admin
- Comprehensive system dashboard with usage statistics
- Full CRUD operations on halls (create, edit, activate/deactivate)
- User management (create users, assign roles and departments)
- View all bookings across the system
- Manage system settings

## Tech Stack

- **Frontend:** React.js with TypeScript
- **Styling:** Tailwind CSS
- **Routing:** React Router v6
- **Backend:** Supabase (PostgreSQL database, Authentication, Storage)
- **Icons:** Lucide React
- **Build Tool:** Vite

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── BookingForm.tsx
│   ├── Calendar.tsx
│   ├── Layout.tsx
│   └── ProtectedRoute.tsx
├── contexts/           # React contexts
│   └── AuthContext.tsx
├── lib/               # Library configurations
│   └── supabase.ts
├── pages/             # Page components
│   ├── admin/        # Super admin pages
│   ├── department/   # Department user pages
│   ├── principal/    # Principal pages
│   ├── shared/       # Shared pages
│   └── Login.tsx
├── types/            # TypeScript definitions
│   └── database.ts
└── App.tsx           # Main app component
```

## Database Schema

### Tables
1. **departments** - College departments (IT, CSE, MBA, etc.)
2. **halls** - Hall information with capacity, type, and images
3. **profiles** - User profiles with roles and department associations
4. **bookings** - Booking requests with approval workflow

### Row Level Security (RLS)
All tables have comprehensive RLS policies ensuring:
- Department users can only view their own bookings
- Principals can view and manage all booking requests
- Super admins have full system access
- Data integrity and security are maintained

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd hall-booking-system
```

2. Install dependencies:
```bash
npm install
```

3. Environment variables are already configured in `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The production build will be created in the `dist` directory.

## Creating Users

### Option 1: Using Super Admin Interface
1. Create your first super admin user via Supabase Dashboard
2. Log in as super admin
3. Navigate to Users Management
4. Create department users and assign them to departments

### Option 2: Using Supabase Dashboard
1. Go to Authentication > Users in Supabase Dashboard
2. Create users with appropriate metadata:
   - `role`: 'department_user', 'principal', or 'super_admin'
   - `full_name`: User's full name

See `DEMO_CREDENTIALS.md` for demo account information.

## User Roles

### Department User
- Can browse halls
- Can create booking requests
- Can view their own bookings
- Cannot approve bookings

### Principal
- Can view all booking requests
- Can approve or reject bookings
- Can view complete booking history
- Cannot manage users or halls

### Super Admin
- Full system access
- Can manage halls (CRUD operations)
- Can manage users (CRUD operations)
- Can view all bookings and statistics

## Key Features

### Calendar System
- Month-by-month navigation
- Color-coded booking status:
  - **Green:** Approved booking
  - **Yellow:** Pending approval
  - **White:** Available for booking
- Shows department abbreviation for booked dates
- Prevents double-booking

### Booking Workflow
1. Department user selects a hall and date
2. Fills out event details and uploads approval letter
3. Booking enters "Pending" status
4. Principal reviews the request
5. Principal approves or rejects with reason
6. User is notified of the decision

### Document Management
- Secure file upload to Supabase Storage
- Supports PDF, PNG, JPG formats
- Public access to uploaded documents
- Organized storage structure

### Responsive Design
- Mobile-first approach
- Tablet and desktop optimized
- Collapsible navigation on mobile
- Touch-friendly interface

## Security Features

- Email/password authentication with Supabase Auth
- Role-based access control (RBAC)
- Row Level Security (RLS) on all database tables
- Protected routes based on user roles
- Secure file storage with access policies
- Input validation and sanitization

## Customization

### Adding New Halls
1. Log in as Super Admin
2. Navigate to Manage Halls
3. Click "Add Hall"
4. Fill in hall details (name, type, capacity, stage size, image URL)
5. Save

### Managing Departments
Departments are pre-configured but can be modified directly in the Supabase database:
```sql
INSERT INTO departments (name, short_name)
VALUES ('Your Department', 'DEPT');
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is licensed under the MIT License.

## Support

For issues or questions, please contact your system administrator.

---

Built with React, TypeScript, Tailwind CSS, and Supabase
