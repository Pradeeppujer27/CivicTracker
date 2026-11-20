-- ==============================================================
-- CivicTrack – Public Grievance and Civic Issue Reporting System
-- Database Creation & Seed Script for MySQL 8.0+
-- Database Name: civictrack
-- Target Framework: Spring Boot 3.x, Spring Data JPA, Hibernate
-- ==============================================================

-- 1. Create Database with UTF-8 Multilingual Support
CREATE DATABASE IF NOT EXISTS civictrack
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE civictrack;

-- Temporarily disable foreign key constraints to allow clean rebuilds
SET FOREIGN_KEY_CHECKS = 0;

-- Drop views if existing
DROP VIEW IF EXISTS grievances;
DROP VIEW IF EXISTS attachments;
DROP VIEW IF EXISTS grievance_status_logs;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS complaint_updates;
DROP TABLE IF EXISTS complaint_images;
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================
-- TABLE 1: users
-- Citizen and municipal administration user accounts
-- ==============================================================
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL COMMENT 'Full legal name of citizen or municipal official',
    email VARCHAR(100) NOT NULL COMMENT 'Unique email address for authentication',
    phone_number VARCHAR(20) NULL COMMENT 'Mobile number for SMS updates',
    address TEXT NULL COMMENT 'Residential / organizational street address',
    password_hash VARCHAR(255) NOT NULL COMMENT 'Salted BCrypt hash (no plaintext storage)',
    role ENUM('ROLE_CITIZEN', 'ROLE_OFFICIAL', 'ROLE_ADMIN', 'ROLE_STAFF') NOT NULL DEFAULT 'ROLE_CITIZEN' COMMENT 'Access control role',
    department VARCHAR(100) NULL COMMENT 'Assigned municipal department for officials',
    is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Account status flag',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Registration timestamp',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last modification timestamp',

    -- Constraints & Indexes
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT uk_users_phone UNIQUE (phone_number),
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='CivicTrack user accounts and roles';

-- ==============================================================
-- TABLE 2: complaints
-- Core municipal grievance records reported by citizens
-- ==============================================================
CREATE TABLE complaints (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    complaint_number VARCHAR(50) NOT NULL COMMENT 'Unique tracking identifier (e.g. GRV-2026-8910)',
    user_id BIGINT NOT NULL COMMENT 'Foreign key to users table (complainant citizen)',
    title VARCHAR(200) NOT NULL COMMENT 'Short summary of the civic problem',
    description TEXT NOT NULL COMMENT 'Detailed explanation of the issue',
    category VARCHAR(100) NOT NULL COMMENT 'Civic issue category (e.g. Road Damage, Water Supply)',
    department VARCHAR(100) NOT NULL DEFAULT 'Public Works Department (PWD)' COMMENT 'Responsible municipal department',
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM' COMMENT 'Urgency level',
    status ENUM('SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED') NOT NULL DEFAULT 'SUBMITTED' COMMENT 'Current lifecycle state',
    location_address VARCHAR(255) NOT NULL COMMENT 'Street address or landmark description',
    latitude DECIMAL(10, 8) NULL COMMENT 'GPS latitude captured from device Geolocation API',
    longitude DECIMAL(11, 8) NULL COMMENT 'GPS longitude captured from device Geolocation API',
    admin_remarks TEXT NULL COMMENT 'Official administrative directives or resolution summary',
    resolved_at TIMESTAMP NULL DEFAULT NULL COMMENT 'Timestamp when ticket was certified RESOLVED',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Submission timestamp',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last status update timestamp',

    -- Foreign Key: User-to-Complaint Relationship
    CONSTRAINT fk_complaints_user 
        FOREIGN KEY (user_id) REFERENCES users (id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,

    -- Constraints & Frequently Searched Indexes
    CONSTRAINT uk_complaints_number UNIQUE (complaint_number),
    INDEX idx_complaints_user_id (user_id),
    INDEX idx_complaints_status (status),
    INDEX idx_complaints_category (category),
    INDEX idx_complaints_priority (priority),
    INDEX idx_complaints_created_at (created_at)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='Citizen complaint registry';

-- ==============================================================
-- TABLE 3: complaint_images
-- Photographic proof and attachment files for complaints
-- ==============================================================
CREATE TABLE complaint_images (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    complaint_id BIGINT NOT NULL COMMENT 'Foreign key to complaints table',
    file_name VARCHAR(255) NOT NULL COMMENT 'Original file name uploaded by user',
    file_path VARCHAR(500) NOT NULL COMMENT 'Relative storage path or URL in uploads repository',
    file_type VARCHAR(100) NULL COMMENT 'MIME type (e.g. image/jpeg, image/png)',
    file_size BIGINT NULL COMMENT 'File size in bytes',
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Upload timestamp',

    -- Foreign Key: Complaint-to-Image Relationship
    CONSTRAINT fk_images_complaint 
        FOREIGN KEY (complaint_id) REFERENCES complaints (id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,

    -- Indexes
    INDEX idx_images_complaint_id (complaint_id)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='Grievance photograph attachments';

-- ==============================================================
-- TABLE 4: complaint_updates
-- Complete audit trail for grievance status changes & admin remarks
-- ==============================================================
CREATE TABLE complaint_updates (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    complaint_id BIGINT NOT NULL COMMENT 'Foreign key to complaints table',
    updated_by_user_id BIGINT NOT NULL COMMENT 'Foreign key to users table (Official or Admin)',
    previous_status VARCHAR(50) NULL COMMENT 'Status prior to update',
    current_status VARCHAR(50) NOT NULL COMMENT 'New status applied',
    remarks TEXT NULL COMMENT 'Official notes or explanation of action taken',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Transition timestamp',

    -- Foreign Keys: Complaint-to-Update & User-to-Update Relationships
    CONSTRAINT fk_updates_complaint 
        FOREIGN KEY (complaint_id) REFERENCES complaints (id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_updates_user 
        FOREIGN KEY (updated_by_user_id) REFERENCES users (id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,

    -- Indexes for Rapid Timeline Audit Retrieval
    INDEX idx_updates_complaint_id (complaint_id),
    INDEX idx_updates_user_id (updated_by_user_id),
    INDEX idx_updates_created_at (created_at)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='Audit trail of status updates and admin remarks';

-- ==============================================================
-- TABLE 5: notifications
-- In-app notifications sent to citizens on grievance status changes
-- ==============================================================
CREATE TABLE notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT 'Recipient citizen user ID',
    complaint_id BIGINT NULL COMMENT 'Associated complaint ID',
    complaint_number VARCHAR(100) NULL COMMENT 'Complaint tracking code (e.g. GRV-2026-8910)',
    title VARCHAR(255) NOT NULL COMMENT 'Notification headline',
    message TEXT NOT NULL COMMENT 'Notification explanation message',
    previous_status VARCHAR(50) NULL COMMENT 'Status prior to transition',
    new_status VARCHAR(50) NOT NULL COMMENT 'Updated status',
    admin_remarks TEXT NULL COMMENT 'Official remarks given by official or administrator',
    is_read BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Read / Unread flag',
    read_at TIMESTAMP NULL DEFAULT NULL COMMENT 'Timestamp when read by recipient',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Generation timestamp',

    -- Foreign Keys
    CONSTRAINT fk_notifications_user 
        FOREIGN KEY (user_id) REFERENCES users (id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_notifications_complaint 
        FOREIGN KEY (complaint_id) REFERENCES complaints (id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,

    -- Indexes
    INDEX idx_notifications_user_id (user_id),
    INDEX idx_notifications_is_read (is_read),
    INDEX idx_notifications_created_at (created_at)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='Citizen in-app grievance status notifications';

-- ==============================================================
-- SPRING DATA JPA COMPATIBILITY VIEWS
-- Allows Spring Boot repositories to query either standard naming
-- ==============================================================
CREATE OR REPLACE VIEW grievances AS 
SELECT 
    id, 
    complaint_number,
    complaint_number AS tracking_number,
    user_id,
    user_id AS citizen_id,
    title,
    description,
    category,
    department,
    priority,
    status,
    location_address,
    latitude,
    longitude,
    admin_remarks,
    admin_remarks AS resolution_notes,
    resolved_at,
    created_at,
    updated_at
FROM complaints;

CREATE OR REPLACE VIEW attachments AS 
SELECT 
    id,
    complaint_id,
    complaint_id AS grievance_id,
    file_name,
    file_path,
    file_type,
    file_size,
    uploaded_at
FROM complaint_images;

CREATE OR REPLACE VIEW grievance_status_logs AS 
SELECT 
    id,
    complaint_id,
    complaint_id AS grievance_id,
    updated_by_user_id,
    updated_by_user_id AS changed_by_user_id,
    previous_status,
    previous_status AS old_status,
    current_status,
    current_status AS new_status,
    remarks,
    created_at
FROM complaint_updates;

-- ==============================================================
-- SAMPLE DEVELOPMENT DATA
-- Default Passwords: password123 (Encrypted using BCrypt with 10 rounds)
-- Salted Hash: $2a$10$wK1k6iVjGk1Oq9kQZ5k1v.fVbQxT9kUqK4gPZ9m4N0j5B2u8W8m1O
-- ==============================================================

-- 1. Insert Initial Users (Admin, Department Official, Citizens)
