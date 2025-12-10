export interface Institution {
    id: string;
    name: string;
    short_name?: string;
    logo_url?: string;
    created_at: string;
}

export interface User {
    id: string;
    email: string;
    full_name: string;
    role: 'department_user' | 'principal' | 'super_admin';
    department_id: string | null;
    institution_id: string | null;
    department?: {
        id: string;
        name: string;
        short_name: string;
    } | null;
    institution?: {
        id: string;
        name: string;
        short_name: string;
    } | null;
    created_at: string;
}

export interface Department {
    id: string;
    name: string;
    short_name: string;
    institution_id: string;
}

export interface Hall {
    id: string;
    name: string;
    description: string;
    image_url: string;
    stage_size: string;
    seating_capacity: number;
    hall_type: string;
    institution_id: string;
    is_active: boolean;
    facilities?: string[];
    created_at?: string;
}
