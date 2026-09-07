-- ============================================================
-- Bologna University Intake Portal — MySQL Schema
-- ============================================================
-- Run this file to create all tables from scratch.
-- Usage: mysql -u root -p bologna_db < database/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS bologna_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bologna_db;

-- ─────────────────────────────────────────────────────────────
-- 1. admins
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  email    VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 2. applications
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id                           INT AUTO_INCREMENT PRIMARY KEY,
  first_name                   VARCHAR(100)  DEFAULT '',
  last_name                    VARCHAR(100)  DEFAULT '',
  full_name                    VARCHAR(200)  NOT NULL,
  certificate_name             VARCHAR(200)  NOT NULL,
  dob                          DATE          NOT NULL,
  gender                       ENUM('Male','Female','Prefer Not to Say') NOT NULL,
  email                        VARCHAR(255)  NOT NULL UNIQUE,
  reference_number             VARCHAR(100)  UNIQUE,
  unique_token                 VARCHAR(100)  UNIQUE,
  phone                        VARCHAR(50)   NOT NULL,
  passport_number              VARCHAR(100)  NOT NULL,
  country                      VARCHAR(100)  NOT NULL,
  address                      TEXT          NOT NULL,
  department                   VARCHAR(150)  NOT NULL,
  programme                    VARCHAR(200)  NOT NULL,
  course_start_date            VARCHAR(100)  DEFAULT '',
  course_end_date              VARCHAR(100)  DEFAULT '',
  intake                       VARCHAR(150)  DEFAULT '',
  credit_hours                 VARCHAR(100)  DEFAULT '',
  price                        VARCHAR(100)  DEFAULT '',
  registration_via_centre      VARCHAR(10)   DEFAULT 'No',
  centre_name                  VARCHAR(200)  DEFAULT '',
  centre_email                 VARCHAR(255)  DEFAULT '',
  centre_phone                 VARCHAR(50)   DEFAULT '',
  highest_qualification        VARCHAR(200)  NOT NULL,
  profile_picture              VARCHAR(500)  DEFAULT '',
  passport_copy                VARCHAR(500)  DEFAULT '',
  resume                       VARCHAR(500)  DEFAULT '',
  transcript1                  VARCHAR(500)  DEFAULT '',
  transcript2                  VARCHAR(500)  DEFAULT '',
  transcript3                  VARCHAR(500)  DEFAULT '',
  missing_documents            JSON,
  submission_date              DATETIME      DEFAULT CURRENT_TIMESTAMP,
  document_deadline            DATETIME      DEFAULT NULL,
  document_submitted_at        DATETIME      DEFAULT NULL,
  docs_uploaded_at             DATETIME      DEFAULT NULL,
  upload_link                  VARCHAR(500)  DEFAULT '',
  status                       ENUM('Submitted','PendingDocuments','Reviewed','Accepted','Rejected') DEFAULT 'Submitted',
  rejection_reason             TEXT          DEFAULT '',
  documents_uploaded_completed TINYINT(1)    DEFAULT 0,
  expiry_email_sent            TINYINT(1)    DEFAULT 0,
  expired_at                   DATETIME      DEFAULT NULL,
  created_at                   DATETIME      DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_applications_status          (status),
  INDEX idx_applications_submission_date (submission_date),
  INDEX idx_applications_email           (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 3. centres
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS centres (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(200) NOT NULL UNIQUE,
  email      VARCHAR(255) NOT NULL,
  phone      VARCHAR(50)  DEFAULT '',
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 4. academic_departments
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academic_departments (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 5. academic_programmes
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academic_programmes (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  department        VARCHAR(150) NOT NULL,
  programme         VARCHAR(200) NOT NULL,
  credit_hours      VARCHAR(100) DEFAULT '',
  price             VARCHAR(100) DEFAULT '',
  course_start_date VARCHAR(100) DEFAULT '',
  course_end_date   VARCHAR(100) DEFAULT '',
  UNIQUE KEY uq_dept_prog (department(100), programme(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 6. academic_intakes
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academic_intakes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  department VARCHAR(150) NOT NULL,
  programme  VARCHAR(200) NOT NULL,
  intake     VARCHAR(200) NOT NULL,
  UNIQUE KEY uq_dept_prog_intake (department(100), programme(100), intake(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 7. activity_logs
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  action       VARCHAR(200)  NOT NULL,
  description  TEXT          NOT NULL,
  timestamp    DATETIME      DEFAULT CURRENT_TIMESTAMP,
  category     ENUM('application','centre','programme','status','general') DEFAULT 'general',
  performed_by ENUM('Admin','User','System') DEFAULT 'User',

  INDEX idx_logs_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 8. postal_requests
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS postal_requests (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  student_id          VARCHAR(255) NOT NULL,
  application_number  VARCHAR(100) NOT NULL UNIQUE,
  form_full_name      VARCHAR(200) DEFAULT '',
  form_father_name    VARCHAR(200) DEFAULT '',
  form_phone          VARCHAR(50)  DEFAULT '',
  form_address        TEXT,
  form_passport_or_cnic VARCHAR(100) DEFAULT '',
  form_program_name   VARCHAR(200) DEFAULT '',
  form_roll_number    VARCHAR(100) DEFAULT '',
  missing_documents   JSON,
  status              ENUM('DOCUMENT_PENDING','SUBMITTED','EXPIRED') DEFAULT 'DOCUMENT_PENDING',
  document_deadline   DATETIME     DEFAULT NULL,
  submitted_at        DATETIME     DEFAULT NULL,
  expired_at          DATETIME     DEFAULT NULL,
  expiry_email_sent   TINYINT(1)   DEFAULT 0,
  created_at          DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_postal_student_id (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 9. postal_request_documents  (child table for embedded docs)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS postal_request_documents (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  postal_request_id  INT          NOT NULL,
  name               VARCHAR(100) NOT NULL,
  path               VARCHAR(500) NOT NULL,
  uploaded_at        DATETIME     DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (postal_request_id)
    REFERENCES postal_requests(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- Seed default admin (password: admin123 — change immediately!)
-- bcrypt hash of "admin123" with 10 rounds
-- ─────────────────────────────────────────────────────────────
-- INSERT INTO admins (email, password)
-- VALUES ('admissions@wto.utamed.university', '$2b$10$...')
-- ON DUPLICATE KEY UPDATE id=id;

-- ─────────────────────────────────────────────────────────────
-- Seed default academic options
-- ─────────────────────────────────────────────────────────────
INSERT IGNORE INTO academic_departments (name) VALUES
  ('Bachelor'),
  ('Master'),
  ('Doctorate');

INSERT IGNORE INTO academic_programmes
  (department, programme, credit_hours, price, course_start_date, course_end_date) VALUES
  ('Bachelor', 'Bachelor in Education',                                       '120 ECTS', '3,000 EUR', '1 January 2027', '1 July 2028'),
  ('Bachelor', 'Bachelor''s degree in Event and Hospitality Management',      '180 ECTS', '3,000 EUR', '1 July 2026',    '1 July 2027'),
  ('Master',   'Master of continuing Education in Public Administration',     '90 ECTS',  '4,000 EUR', '1 July 2026',    '1 July 2027');

INSERT IGNORE INTO academic_intakes (department, programme, intake) VALUES
  ('Bachelor', 'Bachelor in Education',                                       'January 2026 - July 2026'),
  ('Bachelor', 'Bachelor''s degree in Event and Hospitality Management',      'February 2026 - August 2026'),
  ('Master',   'Master of continuing Education in Public Administration',     'March 2026 - September 2026');
