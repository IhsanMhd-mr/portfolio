-- CreateEnum
CREATE TYPE "PublishState" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('COMPLETED', 'IN_PROGRESS', 'PLANNED');

-- CreateEnum
CREATE TYPE "ProjectCategory" AS ENUM ('WEB', 'FULL_STACK', 'MACHINE_LEARNING', 'JAVA', 'ACADEMIC', 'OTHER');

-- CreateEnum
CREATE TYPE "TechCategory" AS ENUM ('FRONTEND', 'BACKEND', 'DATABASE', 'AI_ML', 'MOBILE', 'TOOLS', 'DEVOPS', 'OTHER');

-- CreateEnum
CREATE TYPE "ExperienceLabel" AS ENUM ('STRONG', 'COMFORTABLE', 'WORKING_KNOWLEDGE', 'LEARNING');

-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'FREELANCE', 'VOLUNTEER');

-- CreateEnum
CREATE TYPE "TimelineEntryType" AS ENUM ('PROJECT', 'ACADEMIC', 'MILESTONE', 'PERSONAL');

-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('HERO', 'ABOUT', 'TECH_STACK', 'FEATURED_PROJECTS', 'PROJECT_GRID', 'PROJECT_TIMELINE', 'EDUCATION', 'EXPERIENCE', 'CUSTOM_CONTENT', 'STACK_GAME', 'CONTACT', 'CALL_TO_ACTION', 'FOOTER_SPACER');

-- CreateEnum
CREATE TYPE "TemplateKey" AS ENUM ('PROFESSIONAL_MINIMAL', 'MODERN_GLASS', 'INTERACTIVE_3D');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('NEW', 'READ', 'REPLIED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MessageCategory" AS ENUM ('GENERAL', 'OPPORTUNITY', 'COLLABORATION', 'OTHER');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'DOCUMENT', 'LOGO');

-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('ROTATING_SPHERE', 'FLOATING_BALLS', 'FALLING_GAME', 'STATIC_FALLBACK');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password_hash" TEXT,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "avatar_url" TEXT,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "email" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracked_sessions" (
    "id" TEXT NOT NULL,
    "sid" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "login_method" TEXT NOT NULL,
    "account_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" TEXT,

    CONSTRAINT "tracked_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_link_intents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_link_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "email_hash" TEXT NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL DEFAULT 'IMAGE',
    "filename" TEXT NOT NULL,
    "altText" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "uploadedById" TEXT,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_profiles" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "logo_text" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT,
    "hero_intro" TEXT,
    "about_bio" TEXT NOT NULL,
    "about_summary" TEXT,
    "technical_interests" TEXT,
    "development_approach" TEXT,
    "current_goals" TEXT,
    "availability_status" TEXT,
    "location_text" TEXT,
    "contact_email" TEXT NOT NULL,
    "default_seo_title" TEXT,
    "default_seo_description" TEXT,
    "footer_text" TEXT,
    "cv_version_label" TEXT,
    "cv_updated_at" TIMESTAMP(3),
    "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
    "profile_image_id" TEXT,
    "logo_image_id" TEXT,
    "favicon_id" TEXT,
    "cv_file_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_links" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "label" TEXT,
    "url" TEXT NOT NULL,
    "icon_key" TEXT,
    "icon_media_id" TEXT,
    "show_in_header" BOOLEAN NOT NULL DEFAULT true,
    "show_in_footer" BOOLEAN NOT NULL DEFAULT true,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_versions" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "state" "PublishState" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "full_description" TEXT,
    "category" "ProjectCategory" NOT NULL DEFAULT 'OTHER',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "status" "ProjectStatus" NOT NULL DEFAULT 'COMPLETED',
    "problem" TEXT,
    "solution" TEXT,
    "my_role" TEXT,
    "main_features" TEXT,
    "system_architecture" TEXT,
    "development_process" TEXT,
    "challenges" TEXT,
    "solutions_detail" TEXT,
    "testing" TEXT,
    "results" TEXT,
    "lessons_learned" TEXT,
    "metrics" JSONB,
    "live_demo_url" TEXT,
    "github_url" TEXT,
    "report_url" TEXT,
    "documentation_url" TEXT,
    "video_url" TEXT,
    "presentation_url" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "show_on_homepage" BOOLEAN NOT NULL DEFAULT false,
    "show_on_timeline" BOOLEAN NOT NULL DEFAULT false,
    "show_on_resume" BOOLEAN NOT NULL DEFAULT false,
    "manual_order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "thumbnail_id" TEXT,
    "cover_image_id" TEXT,
    "architecture_image_id" TEXT,

    CONSTRAINT "project_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_redirects" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "old_slug" TEXT NOT NULL,
    "new_slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_redirects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_images" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technologies" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technologies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technology_versions" (
    "id" TEXT NOT NULL,
    "technology_id" TEXT NOT NULL,
    "state" "PublishState" NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TechCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "experience_label" "ExperienceLabel" NOT NULL DEFAULT 'WORKING_KNOWLEDGE',
    "show_in_stack" BOOLEAN NOT NULL DEFAULT true,
    "show_in_game" BOOLEAN NOT NULL DEFAULT false,
    "show_on_resume" BOOLEAN NOT NULL DEFAULT false,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "logo_id" TEXT,

    CONSTRAINT "technology_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_technologies" (
    "project_id" TEXT NOT NULL,
    "technology_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_technologies_pkey" PRIMARY KEY ("project_id","technology_id")
);

-- CreateTable
CREATE TABLE "timeline_entries" (
    "id" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "project_id" TEXT,

    CONSTRAINT "timeline_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_entry_versions" (
    "id" TEXT NOT NULL,
    "timeline_entry_id" TEXT NOT NULL,
    "state" "PublishState" NOT NULL,
    "title" TEXT NOT NULL,
    "entry_type" "TimelineEntryType" NOT NULL DEFAULT 'PROJECT',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "description" TEXT,
    "status" "ProjectStatus",
    "external_links" JSONB,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "image_id" TEXT,

    CONSTRAINT "timeline_entry_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_technologies" (
    "timeline_entry_id" TEXT NOT NULL,
    "technology_id" TEXT NOT NULL,

    CONSTRAINT "timeline_technologies_pkey" PRIMARY KEY ("timeline_entry_id","technology_id")
);

-- CreateTable
CREATE TABLE "education" (
    "id" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_versions" (
    "id" TEXT NOT NULL,
    "education_id" TEXT NOT NULL,
    "state" "PublishState" NOT NULL,
    "institution" TEXT NOT NULL,
    "qualification" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "grade" TEXT,
    "description" TEXT,
    "modules" TEXT,
    "show_on_resume" BOOLEAN NOT NULL DEFAULT true,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "logo_id" TEXT,

    CONSTRAINT "education_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience" (
    "id" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_versions" (
    "id" TEXT NOT NULL,
    "experience_id" TEXT NOT NULL,
    "state" "PublishState" NOT NULL,
    "organization" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "responsibilities" JSONB,
    "location_text" TEXT,
    "work_type" "WorkType",
    "show_on_resume" BOOLEAN NOT NULL DEFAULT true,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "logo_id" TEXT,

    CONSTRAINT "experience_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_technologies" (
    "experience_id" TEXT NOT NULL,
    "technology_id" TEXT NOT NULL,

    CONSTRAINT "experience_technologies_pkey" PRIMARY KEY ("experience_id","technology_id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "key" "TemplateKey" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "preview_image_url" TEXT,
    "is_active_live" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "draft_template_id" TEXT,
    "has_unpublished_changes" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_sections" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "type" "SectionType" NOT NULL,
    "internal_label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "animation_preset_slug" TEXT,
    "animation_delay" DOUBLE PRECISION DEFAULT 0,
    "animation_stagger" DOUBLE PRECISION DEFAULT 0.08,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_versions" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "template_key" "TemplateKey" NOT NULL,
    "snapshot" JSONB NOT NULL,
    "change_summary" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "rollback_until" TIMESTAMP(3),
    "published_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_settings" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "mode" "GameMode" NOT NULL DEFAULT 'ROTATING_SPHERE',
    "selected_tech_ids" JSONB,
    "ball_count" INTEGER NOT NULL DEFAULT 12,
    "ball_size" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "falling_speed" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "sound_enabled" BOOLEAN NOT NULL DEFAULT false,
    "show_score" BOOLEAN NOT NULL DEFAULT true,
    "instructions" TEXT,
    "background_style" TEXT,
    "physics_enabled" BOOLEAN NOT NULL DEFAULT false,
    "save_scores" BOOLEAN NOT NULL DEFAULT false,
    "leaderboard" BOOLEAN NOT NULL DEFAULT false,
    "mobile_fallback" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_scores" (
    "id" TEXT NOT NULL,
    "player_name" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" "MessageCategory" NOT NULL DEFAULT 'GENERAL',
    "status" "MessageStatus" NOT NULL DEFAULT 'NEW',
    "ip_hash" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "summary" TEXT,
    "login_method" TEXT,
    "login_account_id" TEXT,
    "before_json" JSONB,
    "after_json" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_id" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "tracked_sessions_sid_key" ON "tracked_sessions"("sid");

-- CreateIndex
CREATE INDEX "tracked_sessions_user_id_revoked_at_idx" ON "tracked_sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "tracked_sessions_expires_at_idx" ON "tracked_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "account_link_intents_token_hash_key" ON "account_link_intents"("token_hash");

-- CreateIndex
CREATE INDEX "login_attempts_email_hash_created_at_idx" ON "login_attempts"("email_hash", "created_at");

-- CreateIndex
CREATE INDEX "login_attempts_ip_hash_created_at_idx" ON "login_attempts"("ip_hash", "created_at");

-- CreateIndex
CREATE INDEX "media_assets_kind_idx" ON "media_assets"("kind");

-- CreateIndex
CREATE INDEX "media_assets_deletedAt_idx" ON "media_assets"("deletedAt");

-- CreateIndex
CREATE INDEX "social_links_order_idx" ON "social_links"("order");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "projects_deleted_at_idx" ON "projects"("deleted_at");

-- CreateIndex
CREATE INDEX "project_versions_state_visible_idx" ON "project_versions"("state", "visible");

-- CreateIndex
CREATE INDEX "project_versions_manual_order_idx" ON "project_versions"("manual_order");

-- CreateIndex
CREATE UNIQUE INDEX "project_versions_project_id_state_key" ON "project_versions"("project_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "project_redirects_old_slug_key" ON "project_redirects"("old_slug");

-- CreateIndex
CREATE INDEX "project_images_project_id_order_idx" ON "project_images"("project_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "technologies_slug_key" ON "technologies"("slug");

-- CreateIndex
CREATE INDEX "technologies_deleted_at_idx" ON "technologies"("deleted_at");

-- CreateIndex
CREATE INDEX "technology_versions_category_idx" ON "technology_versions"("category");

-- CreateIndex
CREATE INDEX "technology_versions_order_idx" ON "technology_versions"("order");

-- CreateIndex
CREATE UNIQUE INDEX "technology_versions_technology_id_state_key" ON "technology_versions"("technology_id", "state");

-- CreateIndex
CREATE INDEX "project_technologies_technology_id_idx" ON "project_technologies"("technology_id");

-- CreateIndex
CREATE INDEX "timeline_entries_deleted_at_idx" ON "timeline_entries"("deleted_at");

-- CreateIndex
CREATE INDEX "timeline_entry_versions_start_date_idx" ON "timeline_entry_versions"("start_date");

-- CreateIndex
CREATE INDEX "timeline_entry_versions_order_idx" ON "timeline_entry_versions"("order");

-- CreateIndex
CREATE UNIQUE INDEX "timeline_entry_versions_timeline_entry_id_state_key" ON "timeline_entry_versions"("timeline_entry_id", "state");

-- CreateIndex
CREATE INDEX "timeline_technologies_technology_id_idx" ON "timeline_technologies"("technology_id");

-- CreateIndex
CREATE INDEX "education_deleted_at_idx" ON "education"("deleted_at");

-- CreateIndex
CREATE INDEX "education_versions_order_idx" ON "education_versions"("order");

-- CreateIndex
CREATE UNIQUE INDEX "education_versions_education_id_state_key" ON "education_versions"("education_id", "state");

-- CreateIndex
CREATE INDEX "experience_deleted_at_idx" ON "experience"("deleted_at");

-- CreateIndex
CREATE INDEX "experience_versions_order_idx" ON "experience_versions"("order");

-- CreateIndex
CREATE UNIQUE INDEX "experience_versions_experience_id_state_key" ON "experience_versions"("experience_id", "state");

-- CreateIndex
CREATE INDEX "experience_technologies_technology_id_idx" ON "experience_technologies"("technology_id");

-- CreateIndex
CREATE UNIQUE INDEX "templates_key_key" ON "templates"("key");

-- CreateIndex
CREATE UNIQUE INDEX "pages_key_key" ON "pages"("key");

-- CreateIndex
CREATE INDEX "page_sections_page_id_order_idx" ON "page_sections"("page_id", "order");

-- CreateIndex
CREATE INDEX "page_versions_page_id_is_active_idx" ON "page_versions"("page_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "page_versions_page_id_version_number_key" ON "page_versions"("page_id", "version_number");

-- CreateIndex
CREATE INDEX "game_scores_score_idx" ON "game_scores"("score");

-- CreateIndex
CREATE INDEX "contact_messages_status_idx" ON "contact_messages"("status");

-- CreateIndex
CREATE INDEX "contact_messages_created_at_idx" ON "contact_messages"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracked_sessions" ADD CONSTRAINT "tracked_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracked_sessions" ADD CONSTRAINT "tracked_sessions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_profiles" ADD CONSTRAINT "site_profiles_profile_image_id_fkey" FOREIGN KEY ("profile_image_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_profiles" ADD CONSTRAINT "site_profiles_logo_image_id_fkey" FOREIGN KEY ("logo_image_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_profiles" ADD CONSTRAINT "site_profiles_favicon_id_fkey" FOREIGN KEY ("favicon_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_profiles" ADD CONSTRAINT "site_profiles_cv_file_id_fkey" FOREIGN KEY ("cv_file_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_links" ADD CONSTRAINT "social_links_icon_media_id_fkey" FOREIGN KEY ("icon_media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_versions" ADD CONSTRAINT "project_versions_thumbnail_id_fkey" FOREIGN KEY ("thumbnail_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_versions" ADD CONSTRAINT "project_versions_cover_image_id_fkey" FOREIGN KEY ("cover_image_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_versions" ADD CONSTRAINT "project_versions_architecture_image_id_fkey" FOREIGN KEY ("architecture_image_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_versions" ADD CONSTRAINT "project_versions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_redirects" ADD CONSTRAINT "project_redirects_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_images" ADD CONSTRAINT "project_images_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_images" ADD CONSTRAINT "project_images_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technology_versions" ADD CONSTRAINT "technology_versions_logo_id_fkey" FOREIGN KEY ("logo_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technology_versions" ADD CONSTRAINT "technology_versions_technology_id_fkey" FOREIGN KEY ("technology_id") REFERENCES "technologies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_technologies" ADD CONSTRAINT "project_technologies_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_technologies" ADD CONSTRAINT "project_technologies_technology_id_fkey" FOREIGN KEY ("technology_id") REFERENCES "technologies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_entry_versions" ADD CONSTRAINT "timeline_entry_versions_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_entry_versions" ADD CONSTRAINT "timeline_entry_versions_timeline_entry_id_fkey" FOREIGN KEY ("timeline_entry_id") REFERENCES "timeline_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_technologies" ADD CONSTRAINT "timeline_technologies_timeline_entry_id_fkey" FOREIGN KEY ("timeline_entry_id") REFERENCES "timeline_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_technologies" ADD CONSTRAINT "timeline_technologies_technology_id_fkey" FOREIGN KEY ("technology_id") REFERENCES "technologies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_versions" ADD CONSTRAINT "education_versions_logo_id_fkey" FOREIGN KEY ("logo_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_versions" ADD CONSTRAINT "education_versions_education_id_fkey" FOREIGN KEY ("education_id") REFERENCES "education"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_versions" ADD CONSTRAINT "experience_versions_logo_id_fkey" FOREIGN KEY ("logo_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_versions" ADD CONSTRAINT "experience_versions_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_technologies" ADD CONSTRAINT "experience_technologies_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_technologies" ADD CONSTRAINT "experience_technologies_technology_id_fkey" FOREIGN KEY ("technology_id") REFERENCES "technologies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_draft_template_id_fkey" FOREIGN KEY ("draft_template_id") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_sections" ADD CONSTRAINT "page_sections_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
