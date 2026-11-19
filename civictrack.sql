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
INSERT INTO users (id, full_name, email, phone_number, address, password_hash, role, department, is_active, created_at) VALUES
(1, 'System Administrator', 'admin@civictrack.com', '+91 98765 00001', 'Municipal Corporation HQ, Civil Lines', '$2a$10$wK1k6iVjGk1Oq9kQZ5k1v.fVbQxT9kUqK4gPZ9m4N0j5B2u8W8m1O', 'ROLE_ADMIN', 'Central Administration', TRUE, NOW() - INTERVAL 30 DAY),
(2, 'Superintending Engineer PWD', 'officer@civictrack.com', '+91 98765 00002', 'Division Office, Public Works Department', '$2a$10$wK1k6iVjGk1Oq9kQZ5k1v.fVbQxT9kUqK4gPZ9m4N0j5B2u8W8m1O', 'ROLE_OFFICIAL', 'Public Works Department (PWD)', TRUE, NOW() - INTERVAL 25 DAY),
(3, 'Rahul Sharma', 'citizen@civictrack.com', '+91 98201 12345', 'Flat 402, Green Valley Apts, Sector 4', '$2a$10$wK1k6iVjGk1Oq9kQZ5k1v.fVbQxT9kUqK4gPZ9m4N0j5B2u8W8m1O', 'ROLE_CITIZEN', NULL, TRUE, NOW() - INTERVAL 20 DAY),
(4, 'Priya Patel', 'priya.patel@civictrack.com', '+91 98765 43210', 'B-12 Shanti Nagar, Lane 3', '$2a$10$wK1k6iVjGk1Oq9kQZ5k1v.fVbQxT9kUqK4gPZ9m4N0j5B2u8W8m1O', 'ROLE_CITIZEN', NULL, TRUE, NOW() - INTERVAL 15 DAY),
(5, 'Amit Verma', 'amit.verma@civictrack.com', '+91 97112 34567', 'House 55, Lane 7, Sector 2', '$2a$10$wK1k6iVjGk1Oq9kQZ5k1v.fVbQxT9kUqK4gPZ9m4N0j5B2u8W8m1O', 'ROLE_CITIZEN', NULL, TRUE, NOW() - INTERVAL 10 DAY);

-- 2. Insert Sample Complaints Covering All 6 Statuses
INSERT INTO complaints (id, complaint_number, user_id, title, description, category, department, priority, status, location_address, latitude, longitude, admin_remarks, resolved_at, created_at) VALUES
(1, 'GRV-2026-8910', 3, 'Dangerous Deep Pothole on MG Road Near Brigade Junction', 'A 2-foot wide pothole opened near the central crossroads. Two two-wheelers skidded yesterday. Immediate asphalt repair needed before heavy rain.', 'Road Damage', 'Public Works Department (PWD)', 'HIGH', 'SUBMITTED', 'MG Road & Brigade Road Junction, Central Zone, Bengaluru, Karnataka - 560001', 12.97560000, 77.60660000, NULL, NULL, NOW() - INTERVAL 2 HOUR),

(2, 'GRV-2026-7821', 4, 'Overflowing Municipal Dumpster Near Old Cotton Market', 'Garbage has not been collected for four consecutive days. Stray animals are scattering waste on pedestrian footpaths.', 'Garbage Collection', 'Solid Waste Management', 'HIGH', 'UNDER_REVIEW', 'Cotton Market Road, Near Koppikar Road, Hubballi, Karnataka - 580020', 15.35240000, 75.14320000, 'Preliminary inspection scheduled by sanitation supervisor.', NULL, NOW() - INTERVAL 14 HOUR),

(3, 'GRV-2026-6542', 5, 'High Pressure Water Pipeline Rupture Flooding Alley', 'Main potable water supply pipe ruptured underground. Potable water is shooting up 3 feet and flooding basements in Lane 7.', 'Water Supply', 'Water Supply & Sewerage Board', 'CRITICAL', 'ASSIGNED', 'Near Municipal Council Office, Station Road, Gadag-Betageri, Karnataka - 582101', 15.43120000, 75.63240000, 'Assigned to Emergency Hydraulic Response Unit.', NULL, NOW() - INTERVAL 22 HOUR),

(4, 'GRV-2026-5120', 3, 'Dark Stretch of 5 Non-Functional LED Streetlights', 'Five consecutive street poles are dead for over a week from pole #44 to #49. Walking after 7 PM is hazardous.', 'Streetlight Issues', 'Electricity & Street Lighting', 'MEDIUM', 'IN_PROGRESS', 'Sayyaji Rao Road, Near Devaraja Market, Mysuru, Karnataka - 570001', 12.31120000, 76.65290000, 'Crew deployed on site with hydraulic ladder truck to replace faulty LED drivers.', NULL, NOW() - INTERVAL 36 HOUR),

(5, 'GRV-2026-4419', 4, 'Severe Storm Drain Blockage Causing Waterlogging', 'Stormwater drain is choked with construction debris. Even minor rain creates a knee-deep puddle outside primary clinic.', 'Drainage Problems', 'Water Supply & Sewerage Board', 'HIGH', 'RESOLVED', 'Hampankatta Junction, K.S. Rao Road, Mangaluru, Karnataka - 575001', 12.86980000, 74.84310000, 'Suction tanker cleared 2.4 tons of clogged silt. Drain flow restored.', NOW() - INTERVAL 5 HOUR, NOW() - INTERVAL 48 HOUR),

(6, 'GRV-2026-2241', 5, 'Private Courtyard Tree Trimming Request', 'Requesting municipal staff to trim branches of a private ornamental tree inside personal residential bungalow compound.', 'Public Infrastructure', 'Health & Municipal Sanitation', 'LOW', 'REJECTED', 'College Road, Near Rani Channamma Circle, Belagavi, Karnataka - 590001', 15.85720000, 74.50980000, 'Rejected: Municipal teams only operate on public roadways. Private property maintenance cannot be serviced by public tax funds.', NULL, NOW() - INTERVAL 96 HOUR);

-- 3. Insert Sample Photographic Proof
INSERT INTO complaint_images (id, complaint_id, file_name, file_path, file_type, file_size, uploaded_at) VALUES
(1, 1, 'pothole_crossroad.jpg', 'https://images.unsplash.com/photo-1515263487990-61b07816b324?auto=format&fit=crop&w=800&q=80', 'image/jpeg', 2458900, NOW() - INTERVAL 2 HOUR),
(2, 1, 'pothole_close_up.jpg', 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80', 'image/jpeg', 1845120, NOW() - INTERVAL 2 HOUR),
(3, 2, 'dumpster_overflow.jpg', 'https://images.unsplash.com/photo-1611288870280-4a39626b9a89?auto=format&fit=crop&w=800&q=80', 'image/jpeg', 3120400, NOW() - INTERVAL 14 HOUR),
(4, 3, 'pipe_burst.jpg', 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80', 'image/jpeg', 2890100, NOW() - INTERVAL 22 HOUR),
(5, 4, 'dark_street_poles.jpg', 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80', 'image/jpeg', 1950200, NOW() - INTERVAL 36 HOUR),
(6, 5, 'drainage_cleared.jpg', 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80', 'image/jpeg', 2210500, NOW() - INTERVAL 48 HOUR);

-- 4. Insert Audit Trail Status Updates
INSERT INTO complaint_updates (id, complaint_id, updated_by_user_id, previous_status, current_status, remarks, created_at) VALUES
(1, 1, 3, NULL, 'SUBMITTED', 'Complaint registered with GPS location lock and 2 photos.', NOW() - INTERVAL 2 HOUR),

(2, 2, 4, NULL, 'SUBMITTED', 'Garbage collection complaint submitted by citizen.', NOW() - INTERVAL 14 HOUR),
(3, 2, 1, 'SUBMITTED', 'UNDER_REVIEW', 'Preliminary verification conducted by Sanitary Inspector.', NOW() - INTERVAL 10 HOUR),

(4, 3, 5, NULL, 'SUBMITTED', 'Emergency pipeline burst logged by citizen.', NOW() - INTERVAL 22 HOUR),
(5, 3, 1, 'SUBMITTED', 'ASSIGNED', 'Assigned to Water Supply & Sewerage Board with High Priority tag.', NOW() - INTERVAL 20 HOUR),

(6, 4, 3, NULL, 'SUBMITTED', 'Streetlights malfunction report registered.', NOW() - INTERVAL 36 HOUR),
(7, 4, 1, 'SUBMITTED', 'ASSIGNED', 'Forwarded to Electricity & Street Lighting division.', NOW() - INTERVAL 28 HOUR),
(8, 4, 2, 'ASSIGNED', 'IN_PROGRESS', 'Crew deployed on site with hydraulic ladder truck to replace faulty LED drivers.', NOW() - INTERVAL 8 HOUR),

(9, 5, 4, NULL, 'SUBMITTED', 'Storm drain blockage reported outside health clinic.', NOW() - INTERVAL 48 HOUR),
(10, 5, 1, 'SUBMITTED', 'ASSIGNED', 'Assigned to Water Supply & Sewerage Board.', NOW() - INTERVAL 36 HOUR),
(11, 5, 2, 'ASSIGNED', 'IN_PROGRESS', 'Suction tanker dispatched to site.', NOW() - INTERVAL 16 HOUR),
(12, 5, 2, 'IN_PROGRESS', 'RESOLVED', 'Suction tanker machine cleared 2.4 tons of clogged silt and gravel. Drain flow restored and certified by Ward Engineer.', NOW() - INTERVAL 5 HOUR),

(13, 6, 5, NULL, 'SUBMITTED', 'Private tree branch trimming request registered.', NOW() - INTERVAL 96 HOUR),
(14, 6, 1, 'SUBMITTED', 'REJECTED', 'Rejected: Municipal horticulture and tree maintenance teams only operate on public roadways. Citizen must hire licensed private arborists for private property.', NOW() - INTERVAL 80 HOUR);

-- 5. Insert Sample Citizen In-App Notifications
INSERT INTO notifications (id, user_id, complaint_id, complaint_number, title, message, previous_status, new_status, admin_remarks, is_read, read_at, created_at) VALUES
(1, 3, 4, 'GRV-2026-5120', 'Status Updated: IN PROGRESS', 'Your grievance #GRV-2026-5120 regarding streetlight failure has been updated to IN PROGRESS.', 'ASSIGNED', 'IN_PROGRESS', 'Crew deployed on site with hydraulic ladder truck to replace faulty LED drivers.', FALSE, NULL, NOW() - INTERVAL 8 HOUR),

(2, 3, 1, 'GRV-2026-8910', 'Complaint Acknowledged: SUBMITTED', 'Your complaint #GRV-2026-8910 has been officially registered and queued for municipal review.', NULL, 'SUBMITTED', 'Complaint registered with GPS location lock and photographic evidence.', TRUE, NOW() - INTERVAL 1 HOUR, NOW() - INTERVAL 2 HOUR),

(3, 4, 5, 'GRV-2026-4419', 'Complaint Closed: RESOLVED', 'Your drainage complaint #GRV-2026-4419 has been verified and marked as RESOLVED.', 'IN_PROGRESS', 'RESOLVED', 'Suction tanker machine cleared 2.4 tons of clogged silt and gravel. Drain flow restored and certified by Ward Engineer.', FALSE, NULL, NOW() - INTERVAL 5 HOUR),

(4, 4, 2, 'GRV-2026-7821', 'Status Updated: UNDER REVIEW', 'Your garbage collection grievance #GRV-2026-7821 is currently UNDER REVIEW by sanitary inspectors.', 'SUBMITTED', 'UNDER_REVIEW', 'Preliminary inspection scheduled by sanitation supervisor.', FALSE, NULL, NOW() - INTERVAL 10 HOUR),

(5, 5, 6, 'GRV-2026-2241', 'Complaint Closed: REJECTED', 'Your complaint #GRV-2026-2241 could not be processed under municipal jurisdiction.', 'SUBMITTED', 'REJECTED', 'Rejected: Municipal horticulture and tree maintenance teams only operate on public roadways. Citizen must hire licensed private arborists for private property.', FALSE, NULL, NOW() - INTERVAL 80 HOUR);

-- Advance auto-increment sequence past seed IDs
ALTER TABLE users AUTO_INCREMENT = 100;
ALTER TABLE complaints AUTO_INCREMENT = 100;
ALTER TABLE complaint_images AUTO_INCREMENT = 100;
ALTER TABLE complaint_updates AUTO_INCREMENT = 100;
ALTER TABLE notifications AUTO_INCREMENT = 100;
