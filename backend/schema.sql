

-- Institutions Table
CREATE TABLE IF NOT EXISTS institutions (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(50),
    logo_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(36) PRIMARY KEY,
    institution_id VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    institution_id VARCHAR(36),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role ENUM('department_user', 'principal', 'super_admin', 'designing_team', 'photography_team', 'press_release_team') NOT NULL DEFAULT 'department_user',
    department_id VARCHAR(36),
    theme_preference VARCHAR(50) DEFAULT 'hindusthan',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL
);

-- Halls Table
CREATE TABLE IF NOT EXISTS halls (
    id VARCHAR(36) PRIMARY KEY,
    institution_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    stage_size VARCHAR(100),
    seating_capacity INT,
    hall_type VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    is_ac BOOLEAN DEFAULT FALSE,
    has_sound_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(36) PRIMARY KEY,
    hall_id VARCHAR(36) NOT NULL,
    department_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    booking_date DATE NOT NULL,
    event_title VARCHAR(255) NOT NULL,
    event_description TEXT,
    event_time VARCHAR(100),
    start_time TIME,
    end_time TIME,
    approval_letter_url VARCHAR(255),
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    rejection_reason TEXT,
    is_ac BOOLEAN DEFAULT FALSE,
    is_fan BOOLEAN DEFAULT FALSE,
    is_photography BOOLEAN DEFAULT FALSE,
    media_coordinator_name VARCHAR(255),
    contact_no VARCHAR(50),
    chief_guest_name VARCHAR(255),
    chief_guest_designation VARCHAR(255),
    chief_guest_organization VARCHAR(255),
    chief_guest_photo_url VARCHAR(1000),
    event_partner_organization VARCHAR(255),
    event_partner_details TEXT,
    event_partner_logo_url VARCHAR(1000),
    event_coordinator_name VARCHAR(255),
    event_convenor_details TEXT,
    in_house_guest TEXT,
    work_status ENUM('pending', 'completed') DEFAULT 'pending',
    final_file_url VARCHAR(1000),
    photography_drive_link VARCHAR(1000),
    files_urls JSON,
    approved_by VARCHAR(36),
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hall_id) REFERENCES halls(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
    setting_key VARCHAR(255) PRIMARY KEY,
    setting_value JSON NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(36),
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Press Releases Table
CREATE TABLE IF NOT EXISTS press_releases (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    department_id VARCHAR(36) NOT NULL,
    booking_id VARCHAR(36),
    coordinator_name VARCHAR(255) NOT NULL,
    event_title VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    english_writeup TEXT,
    tamil_writeup TEXT,
    photo_description TEXT,
    photos JSON,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);
