-- Employment Authority Website - Backend V2 application-domain schema
--
-- This is the architectural PostgreSQL baseline. It is intentionally limited
-- to application-domain tables managed by this project.
--
-- AUTHENTICATION TABLES MANAGED BY BETTER AUTH
-- --------------------------------------------
-- Better Auth's user, session, account, verification, and plugin tables are
-- NOT defined here. Generate the exact Better Auth Drizzle schema from the
-- pinned Better Auth version during implementation and manage it separately.
-- app.auth_identities links an application user to a Better Auth user ID (or,
-- during migration, a Firebase UID) without a foreign key to provider-owned
-- tables.
--
-- APPLICATION DOMAIN TABLES MANAGED BY THIS PROJECT
-- -------------------------------------------------
-- All tables below are owned by Backend V2 and are intended to be represented
-- in Drizzle and evolved with reviewed Drizzle Kit migrations.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA IF NOT EXISTS app;
COMMENT ON SCHEMA app IS
  'Employment Authority application-domain data. Better Auth owns its own authentication tables.';

SET search_path = app, public;

CREATE TYPE application_user_status AS ENUM (
  'invited',
  'active',
  'suspended',
  'deactivated'
);

CREATE TYPE auth_identity_provider AS ENUM (
  'firebase',
  'better_auth'
);

CREATE TYPE center_status AS ENUM (
  'active',
  'inactive'
);

CREATE TYPE employer_status AS ENUM (
  'prospect',
  'active',
  'inactive',
  'archived'
);

CREATE TYPE media_provider AS ENUM (
  'cloudflare_r2',
  's3_compatible'
);

CREATE TYPE media_asset_status AS ENUM (
  'pending_upload',
  'ready',
  'failed',
  'quarantined',
  'deleted'
);

CREATE TYPE media_visibility AS ENUM (
  'public',
  'private'
);

CREATE TYPE privacy_request_status AS ENUM (
  'awaiting_employer',
  'awaiting_coordinator',
  'approved',
  'rejected',
  'cancelled',
  'expired'
);

CREATE TYPE privacy_decision_stage AS ENUM (
  'employer',
  'assigned_coordinator'
);

CREATE TYPE privacy_decision_outcome AS ENUM (
  'approved',
  'rejected'
);

CREATE TYPE privacy_grant_status AS ENUM (
  'active',
  'revoked',
  'expired'
);

CREATE TYPE event_publication_status AS ENUM (
  'draft',
  'pending_approval',
  'published',
  'rejected',
  'cancelled'
);

CREATE TYPE event_payment_mode AS ENUM (
  'free',
  'external_link',
  'bit',
  'provider'
);

CREATE TYPE event_media_purpose AS ENUM (
  'cover',
  'logo',
  'gallery',
  'attachment'
);

CREATE TYPE registration_status AS ENUM (
  'pending_payment',
  'confirmed',
  'cancelled',
  'payment_expired'
);

CREATE TYPE payment_status AS ENUM (
  'unverified',
  'created',
  'pending',
  'requires_action',
  'succeeded',
  'failed',
  'cancelled',
  'partially_refunded',
  'refunded'
);

CREATE TYPE payment_evidence_status AS ENUM (
  'provider_verified',
  'legacy_unverified',
  'missing',
  'manual_reconciliation'
);

CREATE TYPE payment_attempt_status AS ENUM (
  'created',
  'pending',
  'requires_action',
  'succeeded',
  'failed',
  'cancelled'
);

CREATE TYPE article_origin AS ENUM (
  'manual',
  'scraper',
  'migration'
);

CREATE TYPE article_status AS ENUM (
  'draft',
  'pending_review',
  'published',
  'rejected',
  'archived'
);

CREATE TYPE promotional_content_status AS ENUM (
  'draft',
  'published',
  'archived'
);

CREATE TYPE promotional_media_kind AS ENUM (
  'image',
  'video'
);

CREATE TYPE content_scrape_run_status AS ENUM (
  'running',
  'succeeded',
  'partially_failed',
  'failed'
);

CREATE TYPE migration_run_status AS ENUM (
  'running',
  'validated',
  'failed',
  'rolled_back'
);

CREATE TYPE migration_run_item_outcome AS ENUM (
  'mapped',
  'unchanged',
  'quarantined',
  'conflict',
  'rejected',
  'archived'
);

CREATE TYPE employer_interaction_kind AS ENUM (
  'note',
  'call',
  'email',
  'meeting',
  'status_change',
  'migration'
);

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_roles_code UNIQUE (code),
  CONSTRAINT ck_roles_code_nonempty CHECK (btrim(code) <> ''),
  CONSTRAINT ck_roles_description_nonempty CHECK (btrim(description) <> '')
);

INSERT INTO roles (code, description)
VALUES
  ('admin', 'Global administrative and moderation responsibilities'),
  ('coordinator', 'Employment-center coordinator responsibilities'),
  ('employer', 'Employer account responsibilities')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  status center_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT uq_centers_code UNIQUE (code),
  CONSTRAINT uq_centers_name UNIQUE (name),
  CONSTRAINT ck_centers_code_nonempty CHECK (btrim(code) <> ''),
  CONSTRAINT ck_centers_name_nonempty CHECK (btrim(name) <> ''),
  CONSTRAINT ck_centers_archive_state CHECK (
    (status = 'inactive' AND archived_at IS NOT NULL)
    OR (status = 'active' AND archived_at IS NULL)
  )
);

CREATE TABLE application_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_email citext NOT NULL,
  status application_user_status NOT NULL DEFAULT 'invited',
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz,
  CONSTRAINT uq_application_users_primary_email UNIQUE (primary_email),
  CONSTRAINT ck_application_users_email_nonempty CHECK (
    btrim(primary_email::text) <> ''
  ),
  CONSTRAINT ck_application_users_deactivated_state CHECK (
    (status = 'deactivated' AND deactivated_at IS NOT NULL)
    OR (status <> 'deactivated' AND deactivated_at IS NULL)
  )
);

COMMENT ON TABLE application_users IS
  'Application identity anchor. Contains no passwords, sessions, provider tokens, or Better Auth internals.';

CREATE TABLE auth_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_user_id uuid NOT NULL,
  provider auth_identity_provider NOT NULL,
  provider_subject text NOT NULL,
  provider_email_snapshot citext,
  linked_at timestamptz NOT NULL DEFAULT now(),
  last_authenticated_at timestamptz,
  retired_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT fk_auth_identities_application_user
    FOREIGN KEY (application_user_id)
    REFERENCES application_users(id)
    ON DELETE RESTRICT,
  CONSTRAINT uq_auth_identities_provider_subject
    UNIQUE (provider, provider_subject),
  CONSTRAINT ck_auth_identities_subject_nonempty CHECK (
    btrim(provider_subject) <> ''
  )
);

CREATE UNIQUE INDEX uq_auth_identities_active_user_provider
  ON auth_identities (application_user_id, provider)
  WHERE retired_at IS NULL;

CREATE INDEX ix_auth_identities_application_user
  ON auth_identities (application_user_id);

COMMENT ON TABLE auth_identities IS
  'Maps provider-owned subject IDs to application users. provider_subject is Firebase UID or Better Auth user.id.';

CREATE TABLE user_profiles (
  application_user_id uuid PRIMARY KEY,
  full_name text NOT NULL,
  preferred_name text,
  locale text NOT NULL DEFAULT 'he-IL',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_user_profiles_application_user
    FOREIGN KEY (application_user_id)
    REFERENCES application_users(id)
    ON DELETE RESTRICT,
  CONSTRAINT ck_user_profiles_full_name_nonempty CHECK (btrim(full_name) <> ''),
  CONSTRAINT ck_user_profiles_locale_nonempty CHECK (btrim(locale) <> '')
);

CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  granted_by_user_id uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_by_user_id uuid,
  revoked_at timestamptz,
  revocation_reason text,
  CONSTRAINT fk_user_roles_application_user
    FOREIGN KEY (application_user_id)
    REFERENCES application_users(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_user_roles_role
    FOREIGN KEY (role_id)
    REFERENCES roles(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_user_roles_granted_by
    FOREIGN KEY (granted_by_user_id)
    REFERENCES application_users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_user_roles_revoked_by
    FOREIGN KEY (revoked_by_user_id)
    REFERENCES application_users(id)
    ON DELETE SET NULL,
  CONSTRAINT ck_user_roles_revocation CHECK (
    (revoked_at IS NULL AND revoked_by_user_id IS NULL AND revocation_reason IS NULL)
    OR (
      revoked_at IS NOT NULL
      AND revoked_at >= granted_at
      AND revocation_reason IS NOT NULL
      AND btrim(revocation_reason) <> ''
    )
  )
);

CREATE UNIQUE INDEX uq_user_roles_active_assignment
  ON user_roles (application_user_id, role_id)
  WHERE revoked_at IS NULL;

CREATE INDEX ix_user_roles_active_role
  ON user_roles (role_id, application_user_id)
  WHERE revoked_at IS NULL;

CREATE TABLE coordinators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_user_id uuid NOT NULL,
  center_id uuid NOT NULL,
  title text,
  public_phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz,
  CONSTRAINT fk_coordinators_application_user
    FOREIGN KEY (application_user_id)
    REFERENCES application_users(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_coordinators_center
    FOREIGN KEY (center_id)
    REFERENCES centers(id)
    ON DELETE RESTRICT,
  CONSTRAINT uq_coordinators_id_center UNIQUE (id, center_id),
  CONSTRAINT ck_coordinators_active_state CHECK (
    (is_active AND deactivated_at IS NULL)
    OR (NOT is_active AND deactivated_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX uq_coordinators_active_application_user
  ON coordinators (application_user_id)
  WHERE is_active;

CREATE INDEX ix_coordinators_center_active
  ON coordinators (center_id, id)
  WHERE is_active;

CREATE TABLE media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider media_provider NOT NULL DEFAULT 'cloudflare_r2',
  bucket_name text NOT NULL,
  object_key text NOT NULL,
  original_filename text,
  content_type text NOT NULL,
  byte_size bigint,
  checksum_sha256 text,
  width_pixels integer,
  height_pixels integer,
  visibility media_visibility NOT NULL DEFAULT 'public',
  status media_asset_status NOT NULL DEFAULT 'pending_upload',
  uploaded_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  deleted_at timestamptz,
  deletion_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT fk_media_assets_uploaded_by
    FOREIGN KEY (uploaded_by_user_id)
    REFERENCES application_users(id)
    ON DELETE SET NULL,
  CONSTRAINT uq_media_assets_provider_object
    UNIQUE (provider, bucket_name, object_key),
  CONSTRAINT ck_media_assets_bucket_nonempty CHECK (btrim(bucket_name) <> ''),
  CONSTRAINT ck_media_assets_object_key_nonempty CHECK (btrim(object_key) <> ''),
  CONSTRAINT ck_media_assets_content_type_nonempty CHECK (btrim(content_type) <> ''),
  CONSTRAINT ck_media_assets_byte_size CHECK (byte_size IS NULL OR byte_size > 0),
  CONSTRAINT ck_media_assets_dimensions CHECK (
    (width_pixels IS NULL OR width_pixels > 0)
    AND (height_pixels IS NULL OR height_pixels > 0)
  ),
  CONSTRAINT ck_media_assets_checksum CHECK (
    checksum_sha256 IS NULL OR checksum_sha256 ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT ck_media_assets_ready_state CHECK (
    status <> 'ready'
    OR (
      byte_size IS NOT NULL
      AND checksum_sha256 IS NOT NULL
      AND verified_at IS NOT NULL
    )
  ),
  CONSTRAINT ck_media_assets_deleted_state CHECK (
    (status = 'deleted' AND deleted_at IS NOT NULL AND deletion_reason IS NOT NULL)
    OR (status <> 'deleted' AND deleted_at IS NULL)
  )
);

CREATE INDEX ix_media_assets_status_created
  ON media_assets (status, created_at);

CREATE TABLE employers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  legal_name text,
  company_number text,
  address text,
  industry text,
  subindustry text,
  target_population text,
  description text,
  jobs_url text,
  logo_media_asset_id uuid,
  status employer_status NOT NULL DEFAULT 'prospect',
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  CONSTRAINT fk_employers_logo_media
    FOREIGN KEY (logo_media_asset_id)
    REFERENCES media_assets(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_employers_created_by
    FOREIGN KEY (created_by_user_id)
    REFERENCES application_users(id)
    ON DELETE SET NULL,
  CONSTRAINT ck_employers_display_name_nonempty CHECK (btrim(display_name) <> ''),
  CONSTRAINT ck_employers_jobs_url CHECK (
    jobs_url IS NULL OR jobs_url ~* '^https?://'
  ),
  CONSTRAINT ck_employers_archive_state CHECK (
    status <> 'archived' OR archived_at IS NOT NULL
  )
);

CREATE UNIQUE INDEX uq_employers_company_number_active
  ON employers (company_number)
  WHERE company_number IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX ix_employers_directory
  ON employers (status, display_name, id)
  WHERE deleted_at IS NULL;

CREATE INDEX ix_employers_industry
  ON employers (industry, status, display_name, id)
  WHERE industry IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX ix_employers_logo_media_active
  ON employers (logo_media_asset_id)
  WHERE logo_media_asset_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE employer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL,
  application_user_id uuid,
  full_name text NOT NULL,
  position_title text,
  is_primary boolean NOT NULL DEFAULT false,
  can_manage_employer boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT fk_employer_contacts_employer
    FOREIGN KEY (employer_id)
    REFERENCES employers(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_employer_contacts_application_user
    FOREIGN KEY (application_user_id)
    REFERENCES application_users(id)
    ON DELETE RESTRICT,
  CONSTRAINT uq_employer_contacts_id_employer UNIQUE (id, employer_id),
  CONSTRAINT uq_employer_contacts_id_employer_user
    UNIQUE (id, employer_id, application_user_id),
  CONSTRAINT ck_employer_contacts_full_name_nonempty CHECK (btrim(full_name) <> '')
);

CREATE UNIQUE INDEX uq_employer_contacts_primary_active
  ON employer_contacts (employer_id)
  WHERE is_primary AND deleted_at IS NULL;

CREATE UNIQUE INDEX uq_employer_contacts_active_user
  ON employer_contacts (application_user_id)
  WHERE application_user_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX ix_employer_contacts_employer_active
  ON employer_contacts (employer_id, full_name, id)
  WHERE deleted_at IS NULL;

CREATE TABLE employer_private_information (
  employer_id uuid PRIMARY KEY,
  primary_contact_id uuid,
  direct_email citext,
  phone text,
  mobile_phone text,
  notes text,
  updated_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_employer_private_information_employer
    FOREIGN KEY (employer_id)
    REFERENCES employers(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_employer_private_information_primary_contact
    FOREIGN KEY (primary_contact_id, employer_id)
    REFERENCES employer_contacts(id, employer_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_employer_private_information_updated_by
    FOREIGN KEY (updated_by_user_id)
    REFERENCES application_users(id)
    ON DELETE SET NULL,
  CONSTRAINT ck_employer_private_information_has_value CHECK (
    direct_email IS NOT NULL
    OR phone IS NOT NULL
    OR mobile_phone IS NOT NULL
    OR notes IS NOT NULL
  )
);

COMMENT ON TABLE employer_private_information IS
  'Sensitive employer contact data. Never include in public employer serializers; access is decided by PrivacyPolicy.';

CREATE TABLE employer_contact_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL,
  employer_contact_id uuid,
  interaction_kind employer_interaction_kind NOT NULL,
  summary text NOT NULL,
  occurred_at timestamptz NOT NULL,
  recorded_by_user_id uuid,
  recorded_by_coordinator_id uuid,
  recorded_by_identity text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT fk_employer_contact_interactions_employer
    FOREIGN KEY (employer_id)
    REFERENCES employers(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_employer_contact_interactions_contact
    FOREIGN KEY (employer_contact_id, employer_id)
    REFERENCES employer_contacts(id, employer_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_employer_contact_interactions_user
    FOREIGN KEY (recorded_by_user_id)
    REFERENCES application_users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_employer_contact_interactions_coordinator
    FOREIGN KEY (recorded_by_coordinator_id)
    REFERENCES coordinators(id)
    ON DELETE RESTRICT,
  CONSTRAINT ck_employer_contact_interactions_summary_nonempty CHECK (
    btrim(summary) <> ''
  ),
  CONSTRAINT ck_employer_contact_interactions_actor_nonempty CHECK (
    btrim(recorded_by_identity) <> ''
  )
);

CREATE INDEX ix_employer_contact_interactions_employer_time
  ON employer_contact_interactions (employer_id, occurred_at DESC, id DESC);

COMMENT ON TABLE employer_contact_interactions IS
  'Append-only CRM/contact activity. Legacy contactHistory is imported here only when its meaning and actor/timestamp are sufficiently reliable; otherwise it is archived as migration evidence.';

CREATE TABLE employer_center_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL,
  center_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_by_user_id uuid,
  ended_by_user_id uuid,
  end_reason text,
  CONSTRAINT fk_employer_center_relationships_employer
    FOREIGN KEY (employer_id)
    REFERENCES employers(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_employer_center_relationships_center
    FOREIGN KEY (center_id)
    REFERENCES centers(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_employer_center_relationships_created_by
    FOREIGN KEY (created_by_user_id)
    REFERENCES application_users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_employer_center_relationships_ended_by
    FOREIGN KEY (ended_by_user_id)
    REFERENCES application_users(id)
    ON DELETE SET NULL,
  CONSTRAINT uq_employer_center_relationships_identity
    UNIQUE (id, employer_id, center_id),
  CONSTRAINT ck_employer_center_relationships_period CHECK (
    ended_at IS NULL OR ended_at >= started_at
  ),
  CONSTRAINT ck_employer_center_relationships_end_reason CHECK (
    (ended_at IS NULL AND ended_by_user_id IS NULL AND end_reason IS NULL)
    OR (ended_at IS NOT NULL AND end_reason IS NOT NULL AND btrim(end_reason) <> '')
  )
);

CREATE UNIQUE INDEX uq_employer_center_relationships_active_employer
  ON employer_center_relationships (employer_id)
  WHERE ended_at IS NULL;

CREATE INDEX ix_employer_center_relationships_center_active
  ON employer_center_relationships (center_id, employer_id)
  WHERE ended_at IS NULL;

CREATE TABLE coordinator_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL,
  coordinator_id uuid NOT NULL,
  center_id uuid NOT NULL,
  center_relationship_id uuid NOT NULL,
  assigned_by_user_id uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  ended_by_user_id uuid,
  ended_at timestamptz,
  end_reason text,
  CONSTRAINT fk_coordinator_assignments_employer
    FOREIGN KEY (employer_id)
    REFERENCES employers(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_coordinator_assignments_coordinator_center
    FOREIGN KEY (coordinator_id, center_id)
    REFERENCES coordinators(id, center_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_coordinator_assignments_center_relationship
    FOREIGN KEY (center_relationship_id, employer_id, center_id)
    REFERENCES employer_center_relationships(id, employer_id, center_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_coordinator_assignments_assigned_by
    FOREIGN KEY (assigned_by_user_id)
    REFERENCES application_users(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_coordinator_assignments_ended_by
    FOREIGN KEY (ended_by_user_id)
    REFERENCES application_users(id)
    ON DELETE SET NULL,
  CONSTRAINT uq_coordinator_assignments_identity
    UNIQUE (id, employer_id, coordinator_id),
  CONSTRAINT ck_coordinator_assignments_period CHECK (
    ended_at IS NULL OR ended_at >= assigned_at
  ),
  CONSTRAINT ck_coordinator_assignments_end_state CHECK (
    (ended_at IS NULL AND ended_by_user_id IS NULL AND end_reason IS NULL)
    OR (ended_at IS NOT NULL AND end_reason IS NOT NULL AND btrim(end_reason) <> '')
  )
);

CREATE UNIQUE INDEX uq_coordinator_assignments_active_employer
  ON coordinator_assignments (employer_id)
  WHERE ended_at IS NULL;

CREATE INDEX ix_coordinator_assignments_active_coordinator
  ON coordinator_assignments (coordinator_id, employer_id)
  WHERE ended_at IS NULL;

COMMENT ON TABLE coordinator_assignments IS
  'A coordinator assignment must use the same center as the referenced employer-center relationship.';

CREATE TABLE privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_coordinator_id uuid NOT NULL,
  employer_id uuid NOT NULL,
  assigned_coordinator_id uuid,
  coordinator_assignment_id uuid,
  status privacy_request_status NOT NULL DEFAULT 'awaiting_employer',
  purpose text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  cancellation_reason text,
  CONSTRAINT fk_privacy_requests_requester
    FOREIGN KEY (requester_coordinator_id)
    REFERENCES coordinators(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_privacy_requests_employer
    FOREIGN KEY (employer_id)
    REFERENCES employers(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_privacy_requests_assignment
    FOREIGN KEY (
      coordinator_assignment_id,
      employer_id,
      assigned_coordinator_id
    )
    REFERENCES coordinator_assignments(id, employer_id, coordinator_id)
    ON DELETE RESTRICT,
  CONSTRAINT uq_privacy_requests_source_identity
    UNIQUE (id, employer_id, requester_coordinator_id),
  CONSTRAINT ck_privacy_requests_purpose_nonempty CHECK (btrim(purpose) <> ''),
  CONSTRAINT ck_privacy_requests_expiry CHECK (expires_at > created_at),
  CONSTRAINT ck_privacy_requests_assignment_shape CHECK (
    (
      assigned_coordinator_id IS NULL
      AND coordinator_assignment_id IS NULL
    )
    OR (
      assigned_coordinator_id IS NOT NULL
      AND coordinator_assignment_id IS NOT NULL
      AND requester_coordinator_id <> assigned_coordinator_id
    )
  ),
  CONSTRAINT ck_privacy_requests_coordinator_state CHECK (
    status <> 'awaiting_coordinator' OR assigned_coordinator_id IS NOT NULL
  ),
  CONSTRAINT ck_privacy_requests_resolution_state CHECK (
    (
      status IN ('awaiting_employer', 'awaiting_coordinator')
      AND resolved_at IS NULL
      AND cancellation_reason IS NULL
    )
    OR (
      status IN ('approved', 'rejected', 'expired')
      AND resolved_at IS NOT NULL
      AND cancellation_reason IS NULL
    )
    OR (
      status = 'cancelled'
      AND resolved_at IS NOT NULL
      AND cancellation_reason IS NOT NULL
      AND btrim(cancellation_reason) <> ''
    )
  )
);

CREATE UNIQUE INDEX uq_privacy_requests_active_request
  ON privacy_requests (employer_id, requester_coordinator_id)
  WHERE status IN ('awaiting_employer', 'awaiting_coordinator');

CREATE INDEX ix_privacy_requests_employer_status
  ON privacy_requests (employer_id, status, created_at DESC);

CREATE INDEX ix_privacy_requests_requester_status
  ON privacy_requests (requester_coordinator_id, status, created_at DESC);

CREATE INDEX ix_privacy_requests_assigned_status
  ON privacy_requests (assigned_coordinator_id, status, created_at DESC)
  WHERE assigned_coordinator_id IS NOT NULL;

CREATE INDEX ix_privacy_requests_pending_expiry
  ON privacy_requests (expires_at)
  WHERE status IN ('awaiting_employer', 'awaiting_coordinator');

CREATE TABLE privacy_request_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  privacy_request_id uuid NOT NULL,
  stage privacy_decision_stage NOT NULL,
  outcome privacy_decision_outcome NOT NULL,
  decided_by_user_id uuid NOT NULL,
  reason text,
  decided_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_privacy_request_decisions_request
    FOREIGN KEY (privacy_request_id)
    REFERENCES privacy_requests(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_privacy_request_decisions_user
    FOREIGN KEY (decided_by_user_id)
    REFERENCES application_users(id)
    ON DELETE RESTRICT,
  CONSTRAINT uq_privacy_request_decisions_stage
    UNIQUE (privacy_request_id, stage)
);

CREATE TABLE privacy_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL,
  grantee_coordinator_id uuid NOT NULL,
  source_privacy_request_id uuid NOT NULL,
  status privacy_grant_status NOT NULL DEFAULT 'active',
  granted_by_user_id uuid NOT NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoked_by_user_id uuid,
  revoked_by_identity text,
  revocation_reason text,
  expired_at timestamptz,
  expired_by_identity text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_privacy_access_grants_source
    FOREIGN KEY (
      source_privacy_request_id,
      employer_id,
      grantee_coordinator_id
    )
    REFERENCES privacy_requests(id, employer_id, requester_coordinator_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_privacy_access_grants_granted_by
    FOREIGN KEY (granted_by_user_id)
    REFERENCES application_users(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_privacy_access_grants_revoked_by
    FOREIGN KEY (revoked_by_user_id)
    REFERENCES application_users(id)
    ON DELETE SET NULL,
  CONSTRAINT uq_privacy_access_grants_source_request
    UNIQUE (source_privacy_request_id),
  CONSTRAINT ck_privacy_access_grants_period CHECK (expires_at > valid_from),
  CONSTRAINT ck_privacy_access_grants_status_state CHECK (
    (
      status = 'active'
      AND revoked_at IS NULL
      AND revoked_by_user_id IS NULL
      AND revoked_by_identity IS NULL
      AND revocation_reason IS NULL
      AND expired_at IS NULL
      AND expired_by_identity IS NULL
    )
    OR (
      status = 'revoked'
      AND revoked_at IS NOT NULL
      AND revoked_at >= valid_from
      AND revoked_by_identity IS NOT NULL
      AND btrim(revoked_by_identity) <> ''
      AND revocation_reason IS NOT NULL
      AND btrim(revocation_reason) <> ''
      AND expired_at IS NULL
      AND expired_by_identity IS NULL
    )
    OR (
      status = 'expired'
      AND revoked_at IS NULL
      AND revoked_by_user_id IS NULL
      AND revoked_by_identity IS NULL
      AND revocation_reason IS NULL
      AND expired_at IS NOT NULL
      AND expired_at >= expires_at
      AND expired_by_identity IS NOT NULL
      AND btrim(expired_by_identity) <> ''
    )
  )
);

CREATE UNIQUE INDEX uq_privacy_access_grants_active_pair
  ON privacy_access_grants (employer_id, grantee_coordinator_id)
  WHERE status = 'active';

CREATE INDEX ix_privacy_access_grants_active_expiry
  ON privacy_access_grants (expires_at, id)
  WHERE status = 'active';

COMMENT ON TABLE privacy_access_grants IS
  'Access is valid only when status=active, valid_from<=now()<expires_at, and no server-side revocation condition applies.';

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL,
  creator_user_id uuid NOT NULL,
  owner_coordinator_id uuid,
  publication_status event_publication_status NOT NULL DEFAULT 'draft',
  title text NOT NULL,
  event_type text,
  description text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  location_name text,
  location_url text,
  is_online boolean NOT NULL DEFAULT false,
  capacity integer,
  is_accessible boolean NOT NULL DEFAULT false,
  accessibility_contact_name text,
  accessibility_contact_phone text,
  coordinator_contact_name text,
  coordinator_contact_phone text,
  payment_mode event_payment_mode NOT NULL DEFAULT 'free',
  price_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'ILS',
  payment_provider text,
  payment_reference text,
  discount_details text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  published_at timestamptz,
  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  cancelled_at timestamptz,
  cancelled_by_user_id uuid,
  cancellation_reason text,
  archived_at timestamptz,
  archived_by_user_id uuid,
  deleted_at timestamptz,
  deleted_by_user_id uuid,
  CONSTRAINT fk_events_center
    FOREIGN KEY (center_id)
    REFERENCES centers(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_events_creator
    FOREIGN KEY (creator_user_id)
    REFERENCES application_users(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_events_owner_coordinator_center
    FOREIGN KEY (owner_coordinator_id, center_id)
    REFERENCES coordinators(id, center_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_events_reviewed_by
    FOREIGN KEY (reviewed_by_user_id)
    REFERENCES application_users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_events_cancelled_by
    FOREIGN KEY (cancelled_by_user_id)
    REFERENCES application_users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_events_archived_by
    FOREIGN KEY (archived_by_user_id)
    REFERENCES application_users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_events_deleted_by
    FOREIGN KEY (deleted_by_user_id)
    REFERENCES application_users(id)
    ON DELETE SET NULL,
  CONSTRAINT ck_events_title_nonempty CHECK (btrim(title) <> ''),
  CONSTRAINT ck_events_description_nonempty CHECK (btrim(description) <> ''),
  CONSTRAINT ck_events_time_range CHECK (ends_at > starts_at),
  CONSTRAINT ck_events_capacity CHECK (capacity IS NULL OR capacity >= 0),
  CONSTRAINT ck_events_price CHECK (price_amount >= 0),
  CONSTRAINT ck_events_currency CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT ck_events_location_url CHECK (
    location_url IS NULL OR location_url ~* '^https?://'
  ),
  CONSTRAINT ck_events_payment_configuration CHECK (
    (
      payment_mode = 'free'
      AND price_amount = 0
      AND payment_provider IS NULL
      AND payment_reference IS NULL
    )
    OR (
      payment_mode = 'external_link'
      AND price_amount > 0
      AND payment_provider IS NULL
      AND payment_reference IS NOT NULL
      AND payment_reference ~* '^https?://'
    )
    OR (
      payment_mode = 'bit'
      AND price_amount > 0
      AND payment_provider IS NULL
      AND payment_reference IS NOT NULL
      AND btrim(payment_reference) <> ''
    )
    OR (
      payment_mode = 'provider'
      AND price_amount > 0
      AND payment_provider IS NOT NULL
      AND btrim(payment_provider) <> ''
    )
  ),
  CONSTRAINT ck_events_published_state CHECK (
    publication_status <> 'published' OR published_at IS NOT NULL
  ),
  CONSTRAINT ck_events_rejected_state CHECK (
    publication_status <> 'rejected'
    OR (
      reviewed_at IS NOT NULL
      AND rejection_reason IS NOT NULL
      AND btrim(rejection_reason) <> ''
    )
  ),
  CONSTRAINT ck_events_cancelled_state CHECK (
    publication_status <> 'cancelled'
    OR (
      cancelled_at IS NOT NULL
      AND cancellation_reason IS NOT NULL
      AND btrim(cancellation_reason) <> ''
    )
  ),
  CONSTRAINT ck_events_archive_state CHECK (
    (archived_at IS NULL AND archived_by_user_id IS NULL)
    OR (archived_at IS NOT NULL AND archived_by_user_id IS NOT NULL)
  ),
  CONSTRAINT ck_events_delete_state CHECK (
    (deleted_at IS NULL AND deleted_by_user_id IS NULL)
    OR (deleted_at IS NOT NULL AND deleted_by_user_id IS NOT NULL)
  )
);

CREATE INDEX ix_events_public_upcoming
  ON events (starts_at, id)
  WHERE (
    publication_status = 'published'
    AND archived_at IS NULL
    AND deleted_at IS NULL
  );

CREATE INDEX ix_events_center_status_start
  ON events (center_id, publication_status, starts_at, id)
  WHERE deleted_at IS NULL;

CREATE INDEX ix_events_owner_status_start
  ON events (owner_coordinator_id, publication_status, starts_at, id)
  WHERE owner_coordinator_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX ix_events_archive
  ON events (archived_at DESC, id)
  WHERE archived_at IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN events.archived_at IS
  'Archiving is orthogonal to publication_status. Restoring clears archive fields and does not guess a prior publication state.';
COMMENT ON COLUMN events.payment_reference IS
  'Non-secret payment link or destination alias. Provider secrets belong in server environment variables, never this table.';

CREATE TABLE event_publication_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id uuid NOT NULL,
  from_status event_publication_status,
  to_status event_publication_status NOT NULL,
  changed_by_user_id uuid,
  reason text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_event_publication_history_event
    FOREIGN KEY (event_id)
    REFERENCES events(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_event_publication_history_user
    FOREIGN KEY (changed_by_user_id)
    REFERENCES application_users(id)
    ON DELETE SET NULL,
  CONSTRAINT ck_event_publication_history_transition CHECK (
    from_status IS NULL OR from_status <> to_status
  )
);

CREATE INDEX ix_event_publication_history_event_time
  ON event_publication_history (event_id, changed_at DESC);

CREATE TABLE event_media (
  event_id uuid NOT NULL,
  media_asset_id uuid NOT NULL,
  purpose event_media_purpose NOT NULL DEFAULT 'gallery',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, media_asset_id),
  CONSTRAINT fk_event_media_event
    FOREIGN KEY (event_id)
    REFERENCES events(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_event_media_asset
    FOREIGN KEY (media_asset_id)
    REFERENCES media_assets(id)
    ON DELETE RESTRICT,
  CONSTRAINT uq_event_media_position
    UNIQUE (event_id, purpose, display_order),
  CONSTRAINT ck_event_media_display_order CHECK (display_order >= 0)
);

CREATE INDEX ix_event_media_asset
  ON event_media (media_asset_id, event_id);

CREATE TABLE event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  employer_id uuid NOT NULL,
  cycle_number integer NOT NULL,
  submitted_by_contact_id uuid NOT NULL,
  submitted_by_user_id uuid NOT NULL,
  status registration_status NOT NULL,
  registered_at timestamptz NOT NULL DEFAULT now(),
  capacity_hold_expires_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by_user_id uuid,
  cancellation_reason text,
  payment_expired_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_event_registrations_event
    FOREIGN KEY (event_id)
    REFERENCES events(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_event_registrations_employer
    FOREIGN KEY (employer_id)
    REFERENCES employers(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_event_registrations_submitting_contact
    FOREIGN KEY (
      submitted_by_contact_id,
      employer_id,
      submitted_by_user_id
    )
    REFERENCES employer_contacts(id, employer_id, application_user_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_event_registrations_cancelled_by
    FOREIGN KEY (cancelled_by_user_id)
    REFERENCES application_users(id)
    ON DELETE SET NULL,
  CONSTRAINT uq_event_registrations_cycle
    UNIQUE (event_id, employer_id, cycle_number),
  CONSTRAINT ck_event_registrations_cycle_positive CHECK (cycle_number > 0),
  CONSTRAINT ck_event_registrations_hold_state CHECK (
    status <> 'pending_payment'
    OR (
      capacity_hold_expires_at IS NOT NULL
      AND capacity_hold_expires_at > registered_at
      AND confirmed_at IS NULL
      AND payment_expired_at IS NULL
    )
  ),
  CONSTRAINT ck_event_registrations_confirmed_state CHECK (
    status <> 'confirmed' OR confirmed_at IS NOT NULL
  ),
  CONSTRAINT ck_event_registrations_cancelled_state CHECK (
    (
      status = 'cancelled'
      AND cancelled_at IS NOT NULL
      AND cancellation_reason IS NOT NULL
      AND btrim(cancellation_reason) <> ''
      AND payment_expired_at IS NULL
    )
    OR (
      status <> 'cancelled'
      AND cancelled_at IS NULL
      AND cancelled_by_user_id IS NULL
      AND cancellation_reason IS NULL
    )
  ),
  CONSTRAINT ck_event_registrations_payment_expired_state CHECK (
    (
      status = 'payment_expired'
      AND capacity_hold_expires_at IS NOT NULL
      AND payment_expired_at IS NOT NULL
      AND payment_expired_at >= capacity_hold_expires_at
      AND confirmed_at IS NULL
    )
    OR (
      status <> 'payment_expired'
      AND payment_expired_at IS NULL
    )
  )
);

CREATE UNIQUE INDEX uq_event_registrations_active_employer
  ON event_registrations (event_id, employer_id)
  WHERE status IN ('pending_payment', 'confirmed');

CREATE INDEX ix_event_registrations_event_status
  ON event_registrations (event_id, status, registered_at DESC, id DESC);

CREATE INDEX ix_event_registrations_user_time
  ON event_registrations (submitted_by_user_id, registered_at DESC, id DESC);

CREATE INDEX ix_event_registrations_employer_time
  ON event_registrations (employer_id, registered_at DESC, id DESC);

CREATE INDEX ix_event_registrations_active_hold_expiry
  ON event_registrations (capacity_hold_expires_at, id)
  WHERE status = 'pending_payment';

COMMENT ON TABLE event_registrations IS
  'Each row is one employer-owned registration cycle. The backend derives the active employer/contact from the principal, preserves terminal cycles, and creates a new cycle only after cancellation/payment expiry and required refund resolution.';

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency char(3) NOT NULL DEFAULT 'ILS',
  status payment_status NOT NULL DEFAULT 'created',
  evidence_status payment_evidence_status NOT NULL DEFAULT 'provider_verified',
  evidence_reference text,
  provider text,
  provider_payment_reference text,
  idempotency_key text,
  refunded_amount numeric(12,2) NOT NULL DEFAULT 0,
  reconciled_by_user_id uuid,
  reconciled_by_identity text,
  reconciled_at timestamptz,
  reconciliation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  succeeded_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  CONSTRAINT fk_payments_registration
    FOREIGN KEY (registration_id)
    REFERENCES event_registrations(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_payments_reconciled_by
    FOREIGN KEY (reconciled_by_user_id)
    REFERENCES application_users(id)
    ON DELETE SET NULL,
  CONSTRAINT uq_payments_registration UNIQUE (registration_id),
  CONSTRAINT uq_payments_idempotency_key UNIQUE (idempotency_key),
  CONSTRAINT ck_payments_amount CHECK (amount > 0),
  CONSTRAINT ck_payments_currency CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT ck_payments_provider_nonempty CHECK (
    provider IS NULL OR btrim(provider) <> ''
  ),
  CONSTRAINT ck_payments_idempotency_nonempty CHECK (
    idempotency_key IS NULL OR btrim(idempotency_key) <> ''
  ),
  CONSTRAINT ck_payments_evidence_reference_nonempty CHECK (
    evidence_reference IS NULL OR btrim(evidence_reference) <> ''
  ),
  CONSTRAINT ck_payments_evidence_state CHECK (
    (
      evidence_status = 'provider_verified'
      AND status <> 'unverified'
      AND provider IS NOT NULL
      AND idempotency_key IS NOT NULL
      AND reconciled_by_user_id IS NULL
      AND reconciled_by_identity IS NULL
      AND reconciled_at IS NULL
      AND reconciliation_reason IS NULL
    )
    OR (
      evidence_status IN ('legacy_unverified', 'missing')
      AND status = 'unverified'
      AND provider_payment_reference IS NULL
      AND succeeded_at IS NULL
      AND reconciled_by_user_id IS NULL
      AND reconciled_by_identity IS NULL
      AND reconciled_at IS NULL
      AND reconciliation_reason IS NULL
    )
    OR (
      evidence_status = 'manual_reconciliation'
      AND status <> 'unverified'
      AND reconciled_by_identity IS NOT NULL
      AND btrim(reconciled_by_identity) <> ''
      AND reconciled_at IS NOT NULL
      AND reconciliation_reason IS NOT NULL
      AND btrim(reconciliation_reason) <> ''
    )
  ),
  CONSTRAINT ck_payments_status_timestamps CHECK (
    (
      status IN ('succeeded', 'partially_refunded', 'refunded')
      AND succeeded_at IS NOT NULL
    )
    OR (
      status NOT IN ('succeeded', 'partially_refunded', 'refunded')
      AND succeeded_at IS NULL
    )
  ),
  CONSTRAINT ck_payments_failed_state CHECK (
    (status = 'failed' AND failed_at IS NOT NULL)
    OR (status <> 'failed' AND failed_at IS NULL)
  ),
  CONSTRAINT ck_payments_cancelled_state CHECK (
    (status = 'cancelled' AND cancelled_at IS NOT NULL)
    OR (status <> 'cancelled' AND cancelled_at IS NULL)
  ),
  CONSTRAINT ck_payments_refund_state CHECK (
    (
      status = 'partially_refunded'
      AND refunded_amount > 0
      AND refunded_amount < amount
    )
    OR (
      status = 'refunded'
      AND refunded_amount = amount
    )
    OR (
      status NOT IN ('partially_refunded', 'refunded')
      AND refunded_amount = 0
    )
  ),
  CONSTRAINT ck_payments_refund_amount CHECK (
    refunded_amount >= 0 AND refunded_amount <= amount
  )
);

CREATE UNIQUE INDEX uq_payments_provider_reference
  ON payments (provider, provider_payment_reference)
  WHERE provider_payment_reference IS NOT NULL;

CREATE TABLE payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL,
  attempt_number integer NOT NULL,
  status payment_attempt_status NOT NULL DEFAULT 'created',
  amount numeric(12,2) NOT NULL,
  currency char(3) NOT NULL,
  provider text NOT NULL,
  provider_attempt_reference text,
  idempotency_key text NOT NULL,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT fk_payment_attempts_payment
    FOREIGN KEY (payment_id)
    REFERENCES payments(id)
    ON DELETE RESTRICT,
  CONSTRAINT uq_payment_attempts_number
    UNIQUE (payment_id, attempt_number),
  CONSTRAINT uq_payment_attempts_idempotency_key
    UNIQUE (idempotency_key),
  CONSTRAINT ck_payment_attempts_number CHECK (attempt_number > 0),
  CONSTRAINT ck_payment_attempts_amount CHECK (amount > 0),
  CONSTRAINT ck_payment_attempts_currency CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT ck_payment_attempts_provider_nonempty CHECK (btrim(provider) <> ''),
  CONSTRAINT ck_payment_attempts_idempotency_nonempty CHECK (
    btrim(idempotency_key) <> ''
  ),
  CONSTRAINT ck_payment_attempts_completed_state CHECK (
    status IN ('created', 'pending', 'requires_action')
    OR completed_at IS NOT NULL
  )
);

CREATE UNIQUE INDEX uq_payment_attempts_provider_reference
  ON payment_attempts (provider, provider_attempt_reference)
  WHERE provider_attempt_reference IS NOT NULL;

CREATE TABLE payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  payment_id uuid,
  payment_attempt_id uuid,
  signature_valid boolean NOT NULL,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processing_error text,
  CONSTRAINT fk_payment_webhook_events_payment
    FOREIGN KEY (payment_id)
    REFERENCES payments(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_payment_webhook_events_attempt
    FOREIGN KEY (payment_attempt_id)
    REFERENCES payment_attempts(id)
    ON DELETE RESTRICT,
  CONSTRAINT uq_payment_webhook_events_provider_event
    UNIQUE (provider, provider_event_id),
  CONSTRAINT ck_payment_webhook_events_provider_nonempty CHECK (
    btrim(provider) <> ''
  ),
  CONSTRAINT ck_payment_webhook_events_event_nonempty CHECK (
    btrim(provider_event_id) <> ''
  )
);

CREATE INDEX ix_payment_webhook_events_unprocessed
  ON payment_webhook_events (received_at)
  WHERE processed_at IS NULL;

COMMENT ON TABLE payment_webhook_events IS
  'Webhook payload retention/redaction must follow the approved payment/privacy policy; never store card secrets.';

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL,
  actor_user_id uuid,
  notification_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  link_path text,
  subject_type text,
  subject_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  deduplication_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  dismissed_at timestamptz,
  deleted_at timestamptz,
  CONSTRAINT fk_notifications_recipient
    FOREIGN KEY (recipient_user_id)
    REFERENCES application_users(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_notifications_actor
    FOREIGN KEY (actor_user_id)
    REFERENCES application_users(id)
    ON DELETE SET NULL,
  CONSTRAINT ck_notifications_type_nonempty CHECK (
    btrim(notification_type) <> ''
  ),
  CONSTRAINT ck_notifications_title_nonempty CHECK (btrim(title) <> ''),
  CONSTRAINT ck_notifications_body_nonempty CHECK (btrim(body) <> ''),
  CONSTRAINT ck_notifications_link_path CHECK (
    link_path IS NULL OR left(link_path, 1) = '/'
  )
);

CREATE UNIQUE INDEX uq_notifications_deduplication_key
  ON notifications (recipient_user_id, deduplication_key)
  WHERE deduplication_key IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX ix_notifications_recipient_created
  ON notifications (recipient_user_id, created_at DESC, id)
  WHERE deleted_at IS NULL;

CREATE INDEX ix_notifications_recipient_unread
  ON notifications (recipient_user_id, created_at DESC, id)
  WHERE read_at IS NULL AND deleted_at IS NULL;

COMMENT ON TABLE notifications IS
  'Only trusted backend workflows select recipients and create notifications. Browser clients may read or mark their own rows.';

CREATE TABLE content_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_url text NOT NULL,
  selector text NOT NULL DEFAULT 'a',
  is_active boolean NOT NULL DEFAULT true,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_content_sources_created_by
    FOREIGN KEY (created_by_user_id)
    REFERENCES application_users(id)
    ON DELETE SET NULL,
  CONSTRAINT uq_content_sources_url UNIQUE (source_url),
  CONSTRAINT ck_content_sources_name_nonempty CHECK (btrim(name) <> ''),
  CONSTRAINT ck_content_sources_url CHECK (source_url ~* '^https?://'),
  CONSTRAINT ck_content_sources_selector_nonempty CHECK (btrim(selector) <> '')
);

CREATE TABLE content_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_content_keywords_created_by
    FOREIGN KEY (created_by_user_id)
    REFERENCES application_users(id)
    ON DELETE SET NULL,
  CONSTRAINT uq_content_keywords_keyword UNIQUE (keyword),
  CONSTRAINT ck_content_keywords_keyword_nonempty CHECK (btrim(keyword) <> '')
);

CREATE TABLE content_scrape_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by_user_id uuid,
  status content_scrape_run_status NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  sources_attempted integer NOT NULL DEFAULT 0,
  articles_discovered integer NOT NULL DEFAULT 0,
  articles_upserted integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT fk_content_scrape_runs_triggered_by
    FOREIGN KEY (triggered_by_user_id)
    REFERENCES application_users(id)
    ON DELETE SET NULL,
  CONSTRAINT ck_content_scrape_runs_counts CHECK (
    sources_attempted >= 0
    AND articles_discovered >= 0
    AND articles_upserted >= 0
  ),
  CONSTRAINT ck_content_scrape_runs_completion CHECK (
    status = 'running' OR completed_at IS NOT NULL
  )
);

CREATE INDEX ix_content_scrape_runs_started
  ON content_scrape_runs (started_at DESC);

CREATE TABLE articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin article_origin NOT NULL,
  source_id uuid,
  scrape_run_id uuid,
  author_user_id uuid,
  title text NOT NULL,
  source_name text,
  source_url text,
  source_url_sha256 text,
  category text,
  excerpt text,
  body text,
  external_image_url text,
  hero_media_asset_id uuid,
  status article_status NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT fk_articles_source
    FOREIGN KEY (source_id)
    REFERENCES content_sources(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_articles_scrape_run
    FOREIGN KEY (scrape_run_id)
    REFERENCES content_scrape_runs(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_articles_author
    FOREIGN KEY (author_user_id)
    REFERENCES application_users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_articles_reviewer
    FOREIGN KEY (reviewed_by_user_id)
    REFERENCES application_users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_articles_hero_media
    FOREIGN KEY (hero_media_asset_id)
    REFERENCES media_assets(id)
    ON DELETE RESTRICT,
  CONSTRAINT ck_articles_title_nonempty CHECK (btrim(title) <> ''),
  CONSTRAINT ck_articles_source_url_pair CHECK (
    (source_url IS NULL AND source_url_sha256 IS NULL)
    OR (
      source_url IS NOT NULL
      AND source_url_sha256 IS NOT NULL
      AND source_url ~* '^https?://'
      AND source_url_sha256 ~ '^[0-9a-f]{64}$'
    )
  ),
  CONSTRAINT ck_articles_external_image_url CHECK (
    external_image_url IS NULL OR external_image_url ~* '^https?://'
  ),
  CONSTRAINT ck_articles_pending_state CHECK (
    status <> 'pending_review' OR submitted_at IS NOT NULL
  ),
  CONSTRAINT ck_articles_published_state CHECK (
    status <> 'published'
    OR (
      published_at IS NOT NULL
      AND reviewed_at IS NOT NULL
      AND reviewed_by_user_id IS NOT NULL
    )
  ),
  CONSTRAINT ck_articles_rejected_state CHECK (
    status <> 'rejected'
    OR (
      reviewed_at IS NOT NULL
      AND rejection_reason IS NOT NULL
      AND btrim(rejection_reason) <> ''
    )
  ),
  CONSTRAINT ck_articles_archived_state CHECK (
    status <> 'archived' OR archived_at IS NOT NULL
  )
);

CREATE UNIQUE INDEX uq_articles_source_url_hash_active
  ON articles (source_url_sha256)
  WHERE source_url_sha256 IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX ix_articles_publication_feed
  ON articles (published_at DESC, id)
  WHERE status = 'published' AND deleted_at IS NULL;

CREATE INDEX ix_articles_moderation_queue
  ON articles (status, submitted_at, id)
  WHERE status IN ('pending_review', 'rejected') AND deleted_at IS NULL;

CREATE INDEX ix_articles_author_status
  ON articles (author_user_id, status, created_at DESC)
  WHERE author_user_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX ix_articles_hero_media_active
  ON articles (hero_media_asset_id)
  WHERE hero_media_asset_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE article_status_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  article_id uuid NOT NULL,
  from_status article_status,
  to_status article_status NOT NULL,
  changed_by_user_id uuid,
  reason text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_article_status_history_article
    FOREIGN KEY (article_id)
    REFERENCES articles(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_article_status_history_user
    FOREIGN KEY (changed_by_user_id)
    REFERENCES application_users(id)
    ON DELETE SET NULL,
  CONSTRAINT ck_article_status_history_transition CHECK (
    from_status IS NULL OR from_status <> to_status
  )
);

CREATE INDEX ix_article_status_history_article_time
  ON article_status_history (article_id, changed_at DESC);

CREATE TABLE promotional_content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  media_kind promotional_media_kind NOT NULL,
  media_asset_id uuid,
  external_media_url text,
  audience_role_id uuid,
  status promotional_content_status NOT NULL DEFAULT 'draft',
  display_order integer NOT NULL DEFAULT 0,
  created_by_user_id uuid NOT NULL,
  updated_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  CONSTRAINT fk_promotional_content_media
    FOREIGN KEY (media_asset_id)
    REFERENCES media_assets(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_promotional_content_audience_role
    FOREIGN KEY (audience_role_id)
    REFERENCES roles(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_promotional_content_created_by
    FOREIGN KEY (created_by_user_id)
    REFERENCES application_users(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_promotional_content_updated_by
    FOREIGN KEY (updated_by_user_id)
    REFERENCES application_users(id)
    ON DELETE RESTRICT,
  CONSTRAINT ck_promotional_content_title_nonempty CHECK (btrim(title) <> ''),
  CONSTRAINT ck_promotional_content_description_nonempty CHECK (
    btrim(description) <> ''
  ),
  CONSTRAINT ck_promotional_content_media_source CHECK (
    (media_asset_id IS NOT NULL AND external_media_url IS NULL)
    OR (
      media_asset_id IS NULL
      AND external_media_url IS NOT NULL
      AND external_media_url ~* '^https?://'
    )
  ),
  CONSTRAINT ck_promotional_content_display_order CHECK (display_order >= 0),
  CONSTRAINT ck_promotional_content_published_state CHECK (
    status <> 'published' OR published_at IS NOT NULL
  ),
  CONSTRAINT ck_promotional_content_archived_state CHECK (
    status <> 'archived' OR archived_at IS NOT NULL
  )
);

CREATE INDEX ix_promotional_content_active_order
  ON promotional_content_items (audience_role_id, display_order, id)
  WHERE status = 'published' AND deleted_at IS NULL;

CREATE INDEX ix_promotional_content_media_active
  ON promotional_content_items (media_asset_id)
  WHERE media_asset_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid,
  actor_identity text NOT NULL,
  action text NOT NULL,
  subject_type text NOT NULL,
  subject_id text NOT NULL,
  request_id uuid,
  ip_address inet,
  user_agent text,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_audit_logs_actor
    FOREIGN KEY (actor_user_id)
    REFERENCES application_users(id)
    ON DELETE SET NULL,
  CONSTRAINT ck_audit_logs_actor_identity_nonempty CHECK (
    btrim(actor_identity) <> ''
  ),
  CONSTRAINT ck_audit_logs_action_nonempty CHECK (btrim(action) <> ''),
  CONSTRAINT ck_audit_logs_subject_type_nonempty CHECK (
    btrim(subject_type) <> ''
  ),
  CONSTRAINT ck_audit_logs_subject_id_nonempty CHECK (btrim(subject_id) <> '')
);

CREATE INDEX ix_audit_logs_subject_time
  ON audit_logs (subject_type, subject_id, occurred_at DESC, id DESC);

CREATE INDEX ix_audit_logs_actor_time
  ON audit_logs (actor_user_id, occurred_at DESC, id DESC)
  WHERE actor_user_id IS NOT NULL;

CREATE INDEX ix_audit_logs_request
  ON audit_logs (request_id)
  WHERE request_id IS NOT NULL;

CREATE INDEX ix_audit_logs_occurred_time
  ON audit_logs (occurred_at DESC, id DESC);

COMMENT ON TABLE audit_logs IS
  'Append-only security/business audit. Database permissions must deny UPDATE, DELETE, and TRUNCATE to the API runtime role.';

CREATE TABLE data_migration_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system text NOT NULL,
  domain text NOT NULL,
  status migration_run_status NOT NULL DEFAULT 'running',
  source_snapshot_uri text,
  source_manifest_sha256 text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  source_record_count bigint,
  imported_record_count bigint,
  rejected_record_count bigint NOT NULL DEFAULT 0,
  reconciliation jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  CONSTRAINT ck_data_migration_runs_source_nonempty CHECK (
    btrim(source_system) <> ''
  ),
  CONSTRAINT ck_data_migration_runs_domain_nonempty CHECK (btrim(domain) <> ''),
  CONSTRAINT ck_data_migration_runs_counts CHECK (
    (source_record_count IS NULL OR source_record_count >= 0)
    AND (imported_record_count IS NULL OR imported_record_count >= 0)
    AND rejected_record_count >= 0
  ),
  CONSTRAINT ck_data_migration_runs_completion CHECK (
    status = 'running' OR completed_at IS NOT NULL
  )
);

CREATE TABLE legacy_record_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system text NOT NULL,
  source_document_path text NOT NULL,
  target_table text NOT NULL,
  target_primary_key text NOT NULL,
  first_migration_run_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_legacy_record_mappings_first_run
    FOREIGN KEY (first_migration_run_id)
    REFERENCES data_migration_runs(id)
    ON DELETE RESTRICT,
  CONSTRAINT uq_legacy_record_mappings_source_target
    UNIQUE (
      source_system,
      source_document_path,
      target_table,
      target_primary_key
    ),
  CONSTRAINT ck_legacy_record_mappings_source_nonempty CHECK (
    btrim(source_system) <> ''
  ),
  CONSTRAINT ck_legacy_record_mappings_path_nonempty CHECK (
    btrim(source_document_path) <> ''
  ),
  CONSTRAINT ck_legacy_record_mappings_target_nonempty CHECK (
    btrim(target_table) <> '' AND btrim(target_primary_key) <> ''
  )
);

CREATE INDEX ix_legacy_record_mappings_target
  ON legacy_record_mappings (target_table, target_primary_key);

CREATE TABLE data_migration_run_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_run_id uuid NOT NULL,
  source_system text NOT NULL,
  source_document_path text NOT NULL,
  item_key text NOT NULL,
  source_payload_sha256 text NOT NULL,
  outcome migration_run_item_outcome NOT NULL,
  canonical_mapping_id uuid,
  validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_data_migration_run_items_run
    FOREIGN KEY (migration_run_id)
    REFERENCES data_migration_runs(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_data_migration_run_items_mapping
    FOREIGN KEY (canonical_mapping_id)
    REFERENCES legacy_record_mappings(id)
    ON DELETE RESTRICT,
  CONSTRAINT uq_data_migration_run_items_identity
    UNIQUE (
      migration_run_id,
      source_system,
      source_document_path,
      item_key
    ),
  CONSTRAINT ck_data_migration_run_items_source_nonempty CHECK (
    btrim(source_system) <> ''
    AND btrim(source_document_path) <> ''
    AND btrim(item_key) <> ''
  ),
  CONSTRAINT ck_data_migration_run_items_checksum CHECK (
    source_payload_sha256 ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT ck_data_migration_run_items_mapping_state CHECK (
    (
      outcome IN ('mapped', 'unchanged')
      AND canonical_mapping_id IS NOT NULL
    )
    OR (
      outcome IN ('quarantined', 'conflict', 'rejected', 'archived')
      AND canonical_mapping_id IS NULL
    )
  )
);

CREATE INDEX ix_data_migration_run_items_run
  ON data_migration_run_items (
    migration_run_id,
    outcome,
    source_document_path,
    id
  );

COMMENT ON TABLE legacy_record_mappings IS
  'Canonical source-to-target lineage. One source document may have multiple rows because target_primary_key participates in identity.';

COMMENT ON TABLE data_migration_run_items IS
  'Per-run transformation evidence. Ambiguous/conflicting items are quarantined without a canonical target mapping.';

COMMIT;
