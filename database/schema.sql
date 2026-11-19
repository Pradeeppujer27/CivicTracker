-- ==============================================================
-- CivicTrack Database Schema
-- Database: MySQL 8.0+
-- Description: Public Grievance and Civic Issue Reporting System
-- ==============================================================

CREATE DATABASE IF NOT EXISTS civictrack_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE civictrack_db;

-- --------------------------------------------------------------
-- 1. Roles Table
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- --------------------------------------------------------------
-- 2. Departments Table
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- --------------------------------------------------------------
-- 3. Users Table
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone_number VARCHAR(20) UNIQUE,
    address TEXT NULL,
    password_hash VARCHAR(255) NOT NULL,
    department_id BIGINT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_department FOREIGN KEY (department_id) 
        REFERENCES departments (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- --------------------------------------------------------------
-- 4. User Roles Mapping Table
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) 
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) 
        REFERENCES roles (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------------
-- 5. Grievance Categories Table
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    department_id BIGINT NOT NULL,
    sla_days INT DEFAULT 7,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_categories_department FOREIGN KEY (department_id) 
        REFERENCES departments (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- --------------------------------------------------------------
-- 6. Grievances (Complaints) Table
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grievances (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tracking_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category_id BIGINT NOT NULL,
    citizen_id BIGINT NOT NULL,
    assigned_official_id BIGINT NULL,
    department_id BIGINT NOT NULL,
    status ENUM('SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED') DEFAULT 'SUBMITTED',
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
    location_address VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    resolution_notes TEXT NULL,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_grievance_category FOREIGN KEY (category_id) 
        REFERENCES categories (id) ON DELETE RESTRICT,
    CONSTRAINT fk_grievance_citizen FOREIGN KEY (citizen_id) 
        REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_grievance_official FOREIGN KEY (assigned_official_id) 
        REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_grievance_department FOREIGN KEY (department_id) 
        REFERENCES departments (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- --------------------------------------------------------------
-- 7. Grievance Attachments Table
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attachments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    grievance_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_attachment_grievance FOREIGN KEY (grievance_id) 
        REFERENCES grievances (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------------
-- 8. Grievance Status Timeline / History Table
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grievance_status_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    grievance_id BIGINT NOT NULL,
    changed_by_user_id BIGINT NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_status_log_grievance FOREIGN KEY (grievance_id) 
        REFERENCES grievances (id) ON DELETE CASCADE,
    CONSTRAINT fk_status_log_user FOREIGN KEY (changed_by_user_id) 
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------------
-- 9. Grievance Comments Table
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    grievance_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    comment_text TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comment_grievance FOREIGN KEY (grievance_id) 
        REFERENCES grievances (id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_user FOREIGN KEY (user_id) 
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Indexes for search and dashboard performance
CREATE INDEX idx_grievances_tracking ON grievances(tracking_number);
CREATE INDEX idx_grievances_status ON grievances(status);
CREATE INDEX idx_grievances_citizen ON grievances(citizen_id);
CREATE INDEX idx_grievances_department ON grievances(department_id);
CREATE INDEX idx_users_email ON users(email);
