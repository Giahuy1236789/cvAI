CREATE TABLE `applications` (
  `id` char(36) NOT NULL,
  `student_id` char(36) NOT NULL,
  `job_id` char(36) NOT NULL,
  `cv_id` char(36) DEFAULT NULL,
  `cover_letter` text,
  `status` enum('Submitted','Reviewing','Interview','Accepted','Rejected') NOT NULL DEFAULT 'Submitted',
  `applied_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_student_job` (`student_id`,`job_id`),
  KEY `fk_applications_cv` (`cv_id`),
  KEY `idx_applications_job_id` (`job_id`),
  KEY `idx_applications_status` (`status`),
  CONSTRAINT `fk_applications_cv` FOREIGN KEY (`cv_id`) REFERENCES `cvs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_applications_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_applications_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `companies` (
  `id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `logo` varchar(500) DEFAULT NULL,
  `description` text,
  `address` varchar(500) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `industry` varchar(150) DEFAULT NULL,
  `size` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `cv_analyses` (
  `id` char(36) NOT NULL,
  `student_id` char(36) NOT NULL,
  `cv_id` char(36) DEFAULT NULL,
  `cv_score` decimal(5,2) DEFAULT NULL,
  `skill_score` decimal(5,2) DEFAULT NULL,
  `experience_score` decimal(5,2) DEFAULT NULL,
  `education_score` decimal(5,2) DEFAULT NULL,
  `project_score` decimal(5,2) DEFAULT NULL,
  `strengths` json DEFAULT NULL,
  `weaknesses` json DEFAULT NULL,
  `suggestions` json DEFAULT NULL,
  `missing_skills` json DEFAULT NULL,
  `overall_feedback` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `analysis` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_cv_analyses_student` (`student_id`),
  KEY `fk_cv_analyses_cv` (`cv_id`),
  CONSTRAINT `fk_cv_analyses_cv` FOREIGN KEY (`cv_id`) REFERENCES `cvs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cv_analyses_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `cvs` (
  `id` char(36) NOT NULL,
  `student_id` char(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `template` varchar(50) DEFAULT 'template1',
  `personal_info` json DEFAULT NULL,
  `career_objective` text,
  `summary` text,
  `education` json DEFAULT NULL,
  `skills` json DEFAULT NULL,
  `experiences` json DEFAULT NULL,
  `projects` json DEFAULT NULL,
  `certificates` json DEFAULT NULL,
  `languages` json DEFAULT NULL,
  `ai_generated` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cvs_student_id` (`student_id`),
  CONSTRAINT `fk_cvs_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `job_skills` (
  `job_id` char(36) NOT NULL,
  `skill_id` char(36) NOT NULL,
  PRIMARY KEY (`job_id`,`skill_id`),
  KEY `fk_job_skills_skill` (`skill_id`),
  CONSTRAINT `fk_job_skills_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_job_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `job_sync_state` (
  `source` varchar(64) NOT NULL,
  `last_attempt_at` bigint NOT NULL DEFAULT '0',
  `last_success_at` bigint NOT NULL DEFAULT '0',
  `last_error` varchar(128) DEFAULT NULL,
  `summary` json DEFAULT NULL,
  PRIMARY KEY (`source`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `jobs` (
  `id` char(36) NOT NULL,
  `company_id` char(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `location` varchar(255) NOT NULL,
  `salary_min` decimal(15,2) DEFAULT '0.00',
  `salary_max` decimal(15,2) DEFAULT '0.00',
  `experience` varchar(100) DEFAULT 'Fresher',
  `employment_type` varchar(100) DEFAULT 'Full-time',
  `education` varchar(255) DEFAULT NULL,
  `benefits` json DEFAULT NULL,
  `deadline` date DEFAULT NULL,
  `status` enum('active','inactive','closed') DEFAULT 'active',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `skills` json DEFAULT NULL,
  `source` varchar(64) DEFAULT NULL,
  `source_url` text,
  `external_id` varchar(255) DEFAULT NULL,
  `salary_currency` varchar(16) DEFAULT NULL,
  `salary_period` varchar(32) DEFAULT NULL,
  `last_synced_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_jobs_company_id` (`company_id`),
  KEY `idx_jobs_status` (`status`),
  CONSTRAINT `fk_jobs_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `recommendations` (
  `id` char(36) NOT NULL,
  `student_id` char(36) NOT NULL,
  `job_id` char(36) NOT NULL,
  `match_score` decimal(5,2) NOT NULL,
  `breakdown` json DEFAULT NULL,
  `matched_skills` json DEFAULT NULL,
  `missing_skills` json DEFAULT NULL,
  `reasons` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_recommendation` (`student_id`,`job_id`),
  KEY `fk_recommendations_job` (`job_id`),
  CONSTRAINT `fk_recommendations_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_recommendations_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `saved_jobs` (
  `id` char(36) NOT NULL,
  `student_id` char(36) NOT NULL,
  `job_id` char(36) NOT NULL,
  `saved_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_saved_job` (`student_id`,`job_id`),
  KEY `fk_saved_jobs_job` (`job_id`),
  CONSTRAINT `fk_saved_jobs_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_saved_jobs_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `skills` (
  `id` char(36) NOT NULL,
  `name` varchar(150) NOT NULL,
  `category` varchar(100) DEFAULT 'Other',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `student_skills` (
  `student_id` char(36) NOT NULL,
  `skill_id` char(36) NOT NULL,
  PRIMARY KEY (`student_id`,`skill_id`),
  KEY `fk_student_skills_skill` (`skill_id`),
  CONSTRAINT `fk_student_skills_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_student_skills_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `students` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `avatar` varchar(500) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `university` varchar(255) DEFAULT NULL,
  `major` varchar(255) DEFAULT NULL,
  `graduation_year` smallint DEFAULT NULL,
  `career_objective` text,
  `desired_location` varchar(255) DEFAULT NULL,
  `desired_salary` varchar(100) DEFAULT NULL,
  `desired_positions` json DEFAULT NULL,
  `education` json DEFAULT NULL,
  `experiences` json DEFAULT NULL,
  `projects` json DEFAULT NULL,
  `certificates` json DEFAULT NULL,
  `languages` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `skills` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `fk_students_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `users` (
  `id` char(36) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('student','recruiter','admin') NOT NULL DEFAULT 'student',
  `full_name` varchar(255) NOT NULL,
  `company_id` char(36) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_users_company` (`company_id`),
  CONSTRAINT `fk_users_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
