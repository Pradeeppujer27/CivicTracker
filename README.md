# CivicTrack – Public Grievance Redressal & Civic Issue Tracking System

[![Java](https://img.shields.io/badge/Java-21%20LTS-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.0-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Spring Security](https://img.shields.io/badge/Spring%20Security-6.3-6DB33F?style=for-the-badge&logo=springsecurity&logoColor=white)](https://spring.io/projects/spring-security)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![JWT](https://img.shields.io/badge/JWT-Stateless%20Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4%20GIS-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

---

## 📌 College Project Submission Overview

| Parameter | Details |
| :--- | :--- |
| **Project Title** | **CivicTrack – Automated Civic Grievance Redressal & Spatial Tracking Portal** |
| **Academic Purpose** | Final Year / Capstone Engineering Project Submission |
| **Domain** | Full-Stack Web Development, Smart Governance (GovTech), GIS Mapping & Cloud Computing |
| **Complete Documentation** | [PROJECT_DOCUMENTATION.md](file:///p:/CivicTrack/PROJECT_DOCUMENTATION.md) (All 16 IEEE / University Standard Sections) |
| **Database Schema** | [civictrack.sql](file:///p:/CivicTrack/database/civictrack.sql) (MySQL 8.0+ DDL + DML Seeds) |

---

## 🌟 Executive Summary

**CivicTrack** is an enterprise-grade, full-stack municipal grievance management system engineered to bridge the divide between citizens, municipal field officials, and government administrators.

Traditional civic grievance processes suffer from missing accountability, non-transparent paper trails, absent spatial awareness, and delayed updates. CivicTrack resolves this by delivering:
1. **Instant Digital Reporting**: Citizens capture GPS geolocation, upload photographic evidence, select department categories, and submit complaints in under 60 seconds.
2. **Interactive Spatial Mapping**: Built-in Leaflet.js and OpenStreetMap visualizer allows administrators to pinpoint problem clusters across wards and view status-colored markers.
3. **In-App Notification Center**: Citizens receive real-time notification badges and history cards when administrators update complaint statuses or add official remarks.
4. **Role-Based Access Control (RBAC)**: Enforced via Spring Security 6 and stateless JSON Web Tokens (JWT) for `CITIZEN`, `STAFF`, and `ADMIN` personas.

---

## 🛠️ Technology Stack

```
+-----------------------------------------------------------------------------------+
|                                  PRESENTATION                                     |
|  HTML5 • CSS3 (Custom Responsive) • Vanilla ES6+ JS • Bootstrap 5.3 • Leaflet.js  |
+-----------------------------------------+-----------------------------------------+
                                          | RESTful JSON / Multipart
                                          v
+-----------------------------------------------------------------------------------+
|                               BACKEND ARCHITECTURE                                |
|  Java 21 LTS • Spring Boot 3.3 • Spring Security 6 (Stateless JWT) • Spring Data  |
+-----------------------------------------+-----------------------------------------+
                                          | JPA / Hibernate ORM
                                          v
+-----------------------------------------------------------------------------------+
|                                 DATA PERSISTENCE                                  |
|  MySQL 8.0+ Relational DB (Foreign Keys, Cascade Deletes, Indexes, BCrypt Hashes) |
+-----------------------------------------------------------------------------------+
```

- **Frontend Client**: HTML5, Modern CSS3 Flexbox/Grid, Vanilla ES6+ JavaScript, Bootstrap 5.3, Bootstrap Icons, Leaflet.js 1.9.4.
- **Backend Service**: Java 21 LTS, Spring Boot 3.3.0, Spring Web, Spring Data JPA, Spring Security 6, Hibernate, JJWT 0.12.5.
- **Database Engine**: MySQL 8.0+, relational integrity with foreign keys, composite indexes, full timestamp audits.
- **Deployment Platform**: Multi-stage Dockerfile (Eclipse Temurin 21 JRE Alpine), Vercel/Netlify frontend proxies, Render/Railway cloud backends with persistent disk volume.

---

## 📂 Project Structure

```text
CivicTrack/
│
├── frontend/                          # Client-Side Application (Static SPA Architecture)
│   ├── index.html                     # Public landing page with fast tracking lookup
│   ├── login.html                     # Citizen & Staff login portal
│   ├── register.html                  # Citizen registration portal (passwords hashed via BCrypt)
│   ├── citizen-dashboard.html         # Citizen dashboard: metric cards, recent complaints, notification drawer
│   ├── report-grievance.html          # Complaint form: GPS geolocation capture, interactive map picker, photo upload
│   ├── my-complaints.html             # Citizen complaint archive with search, filter, and pagination
│   ├── grievance-details.html         # Detailed complaint view with resolution timeline and official notes
│   ├── admin-dashboard.html           # Admin analytics: status distribution, department load, recent activity
│   ├── admin-complaints.html          # Admin complaint console: status transitions, department routing, remarks
│   ├── admin-map.html                 # Leaflet.js administrative GIS map with interactive cluster pins
│   ├── official-dashboard.html        # Department field staff action center
│   ├── css/
│   │   ├── style.css                  # Core CSS variables, typography, navigation, mobile drawer
│   │   └── dashboard.css              # Metric card widgets, responsive tables, timelines, modal dialogs
│   ├── js/
│   │   ├── api.js                     # Central HTTP client (auto-detects local vs cloud URL, JWT headers)
│   │   ├── auth.js                    # Session manager (JWT decoding, role validation, login/logout guards)
│   │   ├── map.js                     # Leaflet.js helper (GPS acquisition, geocoding fallback, custom markers)
│   │   ├── notification.js            # In-app notification center (polling, unread counter, badge updates)
│   │   ├── grievance.js               # Grievance service wrapper (CRUD, multipart file upload)
│   │   └── main.js                    # UI orchestrator, dynamic role-based navbar, modal alerts
│   └── assets/                        # Icons, graphics, and municipal logos
│
├── backend/                           # Enterprise Spring Boot 3 Backend
│   ├── pom.xml                        # Maven dependencies (Java 21, Spring Boot 3.3, MySQL, JJWT)
│   ├── Dockerfile                     # Multi-stage container build
│   └── src/main/
│       ├── resources/
│       │   ├── application.properties # Default local & cloud-interpolated configuration
│       │   └── application-prod.properties # Cloud deployment profile
│       └── java/com/civictrack/
│           ├── CivicTrackApplication.java # Spring Boot main entrypoint
│           ├── config/                # MVC & Web configurations (File uploads, CORS)
│           │   ├── WebMvcConfig.java
│           │   └── ...
│           ├── controller/            # REST API Controllers
│           │   ├── AuthController.java
│           │   ├── ComplaintController.java
│           │   ├── AdminController.java
│           │   ├── DashboardController.java
│           │   ├── NotificationController.java
│           │   └── UserController.java
│           ├── service/               # Business Logic Contracts & Implementations
│           │   ├── AuthService.java
│           │   ├── ComplaintService.java
│           │   ├── AdminService.java
│           │   ├── NotificationService.java
│           │   ├── FileStorageService.java
│           │   └── impl/
│           ├── repository/            # Spring Data JPA Repositories
│           │   ├── UserRepository.java
│           │   ├── ComplaintRepository.java
│           │   ├── ComplaintImageRepository.java
│           │   ├── ComplaintUpdateRepository.java
│           │   └── NotificationRepository.java
│           ├── entity/                # JPA Relational Entities
│           │   ├── User.java (CITIZEN, STAFF, ADMIN)
│           │   ├── Complaint.java (PENDING, IN_PROGRESS, RESOLVED, REJECTED)
│           │   ├── ComplaintImage.java
│           │   ├── ComplaintUpdate.java
│           │   └── Notification.java
│           ├── dto/                   # Structured Request & Response DTOs
│           ├── security/              # Spring Security 6 & JWT Architecture
│           │   ├── SecurityConfig.java
│           │   ├── JwtTokenProvider.java
│           │   ├── JwtAuthenticationFilter.java
│           │   └── CustomUserDetailsService.java
│           └── exception/             # Global REST Exception Interceptors
│
├── uploads/                           # Persistent directory for uploaded complaint evidence
├── Dockerfile                         # Root Dockerfile for Render / Railway container deployment
├── render.yaml                        # Render Cloud Blueprint (Web service + MySQL + Persistent Disk)
├── railway.json                       # Railway deployment manifest
├── Procfile                           # Process file for cloud runners
├── vercel.json                        # Vercel frontend proxy rules and security headers
├── netlify.toml                       # Netlify frontend proxy rules and build configuration
├── .env.example                       # Cloud environment variables template
├── .gitignore                         # Comprehensive Git exclusions
├── PROJECT_DOCUMENTATION.md           # 16-section complete academic project report
└── README.md                          # Quickstart, setup, and deployment manual
```

---

## 🚀 Quickstart: Running Locally

### Step 1: Prerequisites
- **Java 21 LTS** installed (`java -version`)
- **Maven 3.8+** installed (`mvn -version`)
- **MySQL 8.0+** running on `localhost:3306`
- Modern browser (Chrome / Edge / Firefox)

### Step 2: Database Initialization
1. Start MySQL and run the initialization script:
   ```bash
   mysql -u root -p < p:\CivicTrack\database\civictrack.sql
   ```
   *Or open `database/civictrack.sql` in MySQL Workbench and click Execute (⚡).*
2. This creates:
   - Database: `civictrack`
   - Tables: `users`, `complaints`, `complaint_images`, `complaint_updates`, `notifications`
   - Pre-seeded accounts (passwords hashed using BCrypt)

### Step 3: Run the Spring Boot Backend
1. Open terminal in the backend directory:
   ```powershell
   cd p:\CivicTrack\backend
   mvn spring-boot:run
   ```
2. The server initializes at `http://localhost:8080`.
   - API Base: `http://localhost:8080/api/v1`
   - Uploads Directory: `p:\CivicTrack\uploads`

### Step 4: Run the Frontend
Because the frontend uses standard modern web standards, you can run it using any static server:
- **VS Code Live Server**: Open `p:\CivicTrack\frontend\index.html` and click **"Go Live"** (`http://127.0.0.1:5500`).
- **Python HTTP Server**:
  ```powershell
  cd p:\CivicTrack\frontend
  python -m http.server 3000
  ```
  Visit `http://localhost:3000`.

---

## 🔑 Pre-Configured Test Accounts

All pre-seeded demo accounts share the password: `password123`

| Role | Email Address | Password | Permissions & Scope |
| :--- | :--- | :--- | :--- |
| **Citizen** | `citizen@civictrack.com` | `password123` | File grievances, capture GPS, view timeline, receive notifications |
| **Staff / Official** | `staff@civictrack.com` | `password123` | View assigned department complaints, update status, submit work notes |
| **Administrator** | `admin@civictrack.com` | `password123` | Full system access, GIS map inspection, status overrides, analytics |

---

## 🌐 Production Cloud Deployment Guide

CivicTrack is decoupled and cloud-ready for free-tier platforms:

```
[Vercel / Netlify Frontend]
      │
      │ HTTPS / Reverse Proxy (`/api/v1/*` & `/uploads/*`)
      ▼
[Render / Railway Backend]
      │
      │ Persistent Volume (`/var/data/uploads`)
      ▼
[Managed MySQL Database (Aiven / Railway / AWS RDS)]
```

### Option A: Frontend Deployment (Vercel)
1. Push the repository to GitHub.
2. Sign in to [Vercel](https://vercel.com/) and click **"Add New Project"**.
3. Set **Root Directory** to `frontend` (or keep project root, as `vercel.json` is configured).
4. Update `vercel.json` rewrite destination to point to your live Render backend URL:
   ```json
   {
     "source": "/api/v1/:match*",
     "destination": "https://your-civictrack-backend.onrender.com/api/v1/:match*"
   }
   ```
5. Deploy. Vercel automatically routes API calls and handles HTTPS certificates.

### Option B: Backend Deployment (Render)
1. Create a free account on [Render](https://render.com/).
2. Create a **New Blueprint Instance** and point to `render.yaml`.
3. Render automatically provisions:
   - **Docker Web Service**: Builds via root `Dockerfile` using Eclipse Temurin 21 JRE.
   - **Persistent Disk**: Mounted at `/var/data/uploads` (retains evidence photos across restarts).
   - **Environment Variables**: Reads from `.env` or Render Dashboard.
4. Set required Environment Variables:
   - `SPRING_DATASOURCE_URL`: `jdbc:mysql://<host>:<port>/civictrack?sslMode=REQUIRED`
   - `SPRING_DATASOURCE_USERNAME`: `<db_user>`
   - `SPRING_DATASOURCE_PASSWORD`: `<db_password>`
   - `JWT_SECRET`: `64+ character random hex string`
   - `UPLOAD_DIR`: `/var/data/uploads`

### Option C: Managed MySQL Database
- **Aiven for MySQL** (Free tier available) or **Railway MySQL**:
  1. Spin up a MySQL 8.0 instance.
  2. Copy connection URI parameters into backend environment variables.
  3. Import `database/civictrack.sql` into the remote database.

---

## 📡 REST API Reference

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | Register new citizen account |
| `POST` | `/api/v1/auth/login` | Public | Authenticate user & return JWT token |
| `GET` | `/api/v1/users/me` | Authenticated | Retrieve current user profile & role |
| `POST` | `/api/v1/complaints` | Citizen | Submit new complaint with GPS coordinates & photo |
| `GET` | `/api/v1/complaints/my` | Citizen | Get authenticated citizen's complaints |
| `GET` | `/api/v1/complaints/track/{trackingNumber}` | Public | Public tracking lookup by tracking number |
| `GET` | `/api/v1/complaints/{id}` | Authenticated | Get detailed complaint information & updates |
| `GET` | `/api/v1/admin/complaints` | Staff / Admin | List all complaints with status & department filters |
| `PUT` | `/api/v1/admin/complaints/{id}/status` | Staff / Admin | Update status, assign department & record remarks |
| `GET` | `/api/v1/admin/map-data` | Admin | Fetch geocoded complaint coordinates for GIS map |
| `GET` | `/api/v1/dashboard/stats` | Staff / Admin | Get aggregated KPI metric counts |
| `GET` | `/api/v1/notifications` | Citizen | Get citizen's in-app notifications |
| `PUT` | `/api/v1/notifications/{id}/read` | Citizen | Mark specific notification as read |
| `PUT` | `/api/v1/notifications/read-all` | Citizen | Mark all notifications as read |

---

## 📑 Complete Academic Project Documentation

The repository includes a comprehensive 16-section college project submission report adhering to academic engineering formatting standards:

👉 **[Read Full Project Documentation](file:///p:/CivicTrack/PROJECT_DOCUMENTATION.md)**

### Sections Covered:
1. **Project Abstract** (Scope, methodology, outcomes)
2. **Problem Statement** (Civic governance bottlenecks)
3. **Project Objectives** (Measurable design goals)
4. **Existing System Analysis** (Manual & legacy portal drawbacks)
5. **Proposed System Architecture** (Decoupled, event-driven, secure)
6. **Software Requirements Specification (SRS)** (Java 21, Spring Boot, MySQL, Leaflet)
7. **Hardware Requirements** (Client & Server configurations)
8. **System Architecture & Flow Diagrams** (Full Tier-3 architecture)
9. **Database Design & Relational Schema** (Data dictionary for 5 tables)
10. **Entity-Relationship (ER) Diagram** (Mermaid ER diagram with cardinalities)
11. **Data Flow Diagrams (DFDs)** (Level 0 Context, Level 1 Breakdown, Level 2 Complaint Cycle)
12. **Module Description** (Auth, Citizen, GIS Map, Admin, Notifications)
13. **Comprehensive API Documentation** (Request/response JSON structures)
14. **Installation & Deployment Manual** (Local and cloud step-by-step)
15. **Testing & Quality Assurance Report** (Responsive viewport audit, security tests)
16. **Future Enhancements Roadmap** (AI image triage, SMS gateways, multilingual i18n)

---

## 🔒 Security Best Practices Implemented

- **No Plaintext Credentials**: All user passwords are encrypted using BCrypt (10 rounds).
- **Stateless Session Control**: JSON Web Tokens with HMAC-SHA256 signatures and strict expiration.
- **Strict Role-Based Access Control**: `@PreAuthorize` method-level guards prevent unauthorized administrative endpoint execution.
- **SQL Injection Prevention**: Spring Data JPA parameterized queries and prepared statements.
- **Zero Exposed Secrets**: All sensitive tokens and credentials use `.env.example` templates and environment variable interpolation.

---

## 👨‍💻 Project Submission Notice
This project was developed for academic capstone presentation and municipal civic technology assessment. All source code, database scripts, and design documentation are fully reproducible.
