-- ==============================================================
-- CivicTrack Initial Seed Data
-- Database: MySQL 8.0+
-- ==============================================================

USE civictrack_db;

-- Insert Roles
INSERT INTO roles (id, name) VALUES 
(1, 'ROLE_CITIZEN'),
(2, 'ROLE_OFFICIAL'),
(3, 'ROLE_ADMIN'),
(4, 'ROLE_STAFF')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Insert Departments
INSERT INTO departments (id, name, description, contact_email, contact_phone) VALUES
(1, 'Public Works Department', 'Roads, bridges, drainage, and municipal infrastructure maintenance', 'pwd@civictrack.local', '+1-555-0101'),
(2, 'Water Supply and Sewerage Board', 'Municipal water distribution and sewerage maintenance', 'water@civictrack.local', '+1-555-0102'),
(3, 'Solid Waste Management', 'Garbage collection, street sanitation, and disposal', 'sanitation@civictrack.local', '+1-555-0103'),
(4, 'Electricity Board', 'Street lighting, transformer issues, and power supply hazards', 'electricity@civictrack.local', '+1-555-0104'),
(5, 'Public Health and Safety', 'Vector control, food hygiene, and animal welfare issues', 'health@civictrack.local', '+1-555-0105')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Insert Categories
INSERT INTO categories (id, name, description, department_id, sla_days) VALUES
(1, 'Pothole & Road Repair', 'Potholes, broken pavements, and uneven road surfaces', 1, 5),
(2, 'Drainage & Waterlogging', 'Blocked storm drains, open manholes, and street flooding', 1, 3),
(3, 'Water Leakage & Low Pressure', 'Pipeline bursts, contaminated water supply, or low pressure', 2, 4),
(4, 'Garbage Dump Overflow', 'Uncollected garbage bins and illegal community dumping sites', 3, 2),
(5, 'Streetlight Malfunction', 'Non-functional streetlights or dark zones in public streets', 4, 3),
(6, 'Public Infrastructure', 'Damaged public parks, broken benches, and public assets', 1, 7),
(7, 'Other Civic Issues', 'Miscellaneous civic grievances and public community hazards', 1, 5)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Default Demo Users (BCrypt encrypted password: password123)
-- Hash: $2a$10$wK1k6iVjGk1Oq9kQZ5k1v.fVbQxT9kUqK4gPZ9m4N0j5B2u8W8m1O
INSERT INTO users (id, full_name, email, phone_number, password_hash, department_id, is_active) VALUES
(1, 'System Administrator', 'admin@civictrack.com', '+1-555-9000', '$2a$10$wK1k6iVjGk1Oq9kQZ5k1v.fVbQxT9kUqK4gPZ9m4N0j5B2u8W8m1O', NULL, TRUE),
(2, 'PWD Officer John', 'officer@civictrack.com', '+1-555-9001', '$2a$10$wK1k6iVjGk1Oq9kQZ5k1v.fVbQxT9kUqK4gPZ9m4N0j5B2u8W8m1O', 1, TRUE),
(3, 'Jane Citizen', 'citizen@civictrack.com', '+1-555-9002', '$2a$10$wK1k6iVjGk1Oq9kQZ5k1v.fVbQxT9kUqK4gPZ9m4N0j5B2u8W8m1O', NULL, TRUE)
ON DUPLICATE KEY UPDATE email=VALUES(email);

-- Assign Roles
INSERT INTO user_roles (user_id, role_id) VALUES
(1, 3), -- Admin has ROLE_ADMIN
(2, 2), -- Officer has ROLE_OFFICIAL
(3, 1)  -- Citizen has ROLE_CITIZEN
ON DUPLICATE KEY UPDATE user_id=VALUES(user_id);


-- Insert Sample Grievances for Testing
INSERT INTO grievances (id, tracking_number, title, description, category_id, citizen_id, department_id, status, priority, location_address, latitude, longitude, resolution_notes, created_at) VALUES
(1, 'GRV-2026-8910', 'Dangerous Deep Pothole on Sector 4 Main Boulevard', 'A 2-foot wide pothole opened near the central crossroads. Two two-wheelers skidded yesterday. Immediate asphalt repair needed.', 1, 3, 1, 'SUBMITTED', 'HIGH', 'Crossroad 14, Sector 4 Main Boulevard, Metro Zone', 19.076090, 72.877426, NULL, NOW() - INTERVAL 2 HOUR),
(2, 'GRV-2026-7821', 'Overflowing Municipal Dumpster and Waste Stagnation', 'Garbage has not been collected for four consecutive days. Stray animals are scattering waste on pedestrian footpaths.', 4, 3, 3, 'UNDER_REVIEW', 'HIGH', 'Outside Community Market, Market Road, Sector 9', 19.082150, 72.881230, 'Preliminary inspection scheduled by sanitation team.', NOW() - INTERVAL 14 HOUR),
(3, 'GRV-2026-6542', 'High Pressure Water Pipeline Rupture Flooding Alley', 'Main potable water supply pipe ruptured underground. Water flooding basements in Lane 7.', 3, 3, 2, 'ASSIGNED', 'CRITICAL', 'Lane 7, Near Shiv Mandir, Sector 2', 19.071200, 72.869800, 'Assigned to Emergency Hydraulic Response Unit.', NOW() - INTERVAL 22 HOUR),
(4, 'GRV-2026-5120', 'Dark Stretch of 5 Non-Functional LED Streetlights', 'Five consecutive street poles are dead for over a week from pole #44 to #49. Walking after 7 PM is hazardous.', 5, 3, 4, 'IN_PROGRESS', 'MEDIUM', 'Park Avenue Jogging Track, East Sector 6', 19.088700, 72.894100, 'Crew deployed on site with hydraulic ladder truck to replace faulty LED drivers.', NOW() - INTERVAL 36 HOUR),
(5, 'GRV-2026-4419', 'Severe Storm Drain Blockage Causing Waterlogging', 'Stormwater drain is choked with construction debris. Even minor rain creates knee-deep puddle outside clinic.', 2, 3, 2, 'RESOLVED', 'HIGH', 'Opposite Urban Primary Health Center, Ward 8', 19.065400, 72.871100, 'Suction tanker cleared 2.4 tons of clogged silt. Drain flow restored.', NOW() - INTERVAL 48 HOUR),
(6, 'GRV-2026-2241', 'Private Courtyard Tree Trimming Request', 'Requesting municipal staff to trim branches of a private ornamental tree inside personal bungalow compound.', 6, 3, 5, 'REJECTED', 'LOW', 'Private Compound, Palm Grove Colony', 19.091100, 72.875200, 'Rejected: Municipal teams only operate on public roadways. Private property maintenance cannot be serviced by municipal funds.', NOW() - INTERVAL 96 HOUR)
ON DUPLICATE KEY UPDATE tracking_number=VALUES(tracking_number);

-- Insert Sample Status Logs
INSERT INTO grievance_status_logs (id, grievance_id, changed_by_user_id, old_status, new_status, remarks, created_at) VALUES
(1, 1, 3, NULL, 'SUBMITTED', 'Grievance submitted by citizen with GPS coordinates.', NOW() - INTERVAL 2 HOUR),
(2, 2, 3, NULL, 'SUBMITTED', 'Grievance submitted by citizen.', NOW() - INTERVAL 14 HOUR),
(3, 2, 1, 'SUBMITTED', 'UNDER_REVIEW', 'Preliminary verification conducted by Sanitary Inspector.', NOW() - INTERVAL 10 HOUR),
(4, 3, 3, NULL, 'SUBMITTED', 'Critical water burst reported.', NOW() - INTERVAL 22 HOUR),
(5, 3, 1, 'SUBMITTED', 'ASSIGNED', 'Assigned to Water Supply & Sewerage Board with High Priority tag.', NOW() - INTERVAL 20 HOUR),
(6, 4, 3, NULL, 'SUBMITTED', 'Streetlights not functioning.', NOW() - INTERVAL 36 HOUR),
(7, 4, 1, 'SUBMITTED', 'ASSIGNED', 'Assigned to Electricity Board.', NOW() - INTERVAL 28 HOUR),
(8, 4, 2, 'ASSIGNED', 'IN_PROGRESS', 'Crew deployed on site with hydraulic ladder truck.', NOW() - INTERVAL 8 HOUR),
(9, 5, 3, NULL, 'SUBMITTED', 'Drainage blocked.', NOW() - INTERVAL 48 HOUR),
(10, 5, 2, 'IN_PROGRESS', 'RESOLVED', 'Suction tanker cleared 2.4 tons of clogged silt. Drain flow restored.', NOW() - INTERVAL 5 HOUR),
(11, 6, 1, 'SUBMITTED', 'REJECTED', 'Rejected: Private property maintenance cannot be serviced by municipal funds.', NOW() - INTERVAL 80 HOUR)
ON DUPLICATE KEY UPDATE id=VALUES(id);
