import { sql } from "drizzle-orm";
import {
	bigint,
	boolean,
	char,
	check,
	customType,
	foreignKey,
	index,
	inet,
	integer,
	jsonb,
	numeric,
	pgSchema,
	primaryKey,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

// Drizzle Kit cannot introspect citext into TypeScript automatically. The
// extension and column constraints remain in the reviewed SQL migration.
const citext = customType<{ data: string }>({
	dataType() {
		return "citext";
	},
});

export const app = pgSchema("app");
export const applicationUserStatusInApp = app.enum("application_user_status", ['invited', 'active', 'suspended', 'deactivated'])
export const articleOriginInApp = app.enum("article_origin", ['manual', 'scraper', 'migration'])
export const articleStatusInApp = app.enum("article_status", ['draft', 'pending_review', 'published', 'rejected', 'archived'])
export const authIdentityProviderInApp = app.enum("auth_identity_provider", ['firebase', 'better_auth'])
export const centerStatusInApp = app.enum("center_status", ['active', 'inactive'])
export const contentScrapeRunStatusInApp = app.enum("content_scrape_run_status", ['running', 'succeeded', 'partially_failed', 'failed'])
export const employerInteractionKindInApp = app.enum("employer_interaction_kind", ['note', 'call', 'email', 'meeting', 'status_change', 'migration'])
export const employerStatusInApp = app.enum("employer_status", ['prospect', 'active', 'inactive', 'archived'])
export const eventMediaPurposeInApp = app.enum("event_media_purpose", ['cover', 'logo', 'gallery', 'attachment'])
export const eventPaymentModeInApp = app.enum("event_payment_mode", ['free', 'external_link', 'bit', 'provider'])
export const eventPublicationStatusInApp = app.enum("event_publication_status", ['draft', 'pending_approval', 'published', 'rejected', 'cancelled'])
export const mediaAssetStatusInApp = app.enum("media_asset_status", ['pending_upload', 'ready', 'failed', 'quarantined', 'deleted'])
export const mediaProviderInApp = app.enum("media_provider", ['cloudflare_r2', 's3_compatible'])
export const mediaVisibilityInApp = app.enum("media_visibility", ['public', 'private'])
export const migrationRunItemOutcomeInApp = app.enum("migration_run_item_outcome", ['mapped', 'unchanged', 'quarantined', 'conflict', 'rejected', 'archived'])
export const migrationRunStatusInApp = app.enum("migration_run_status", ['running', 'validated', 'failed', 'rolled_back'])
export const paymentAttemptStatusInApp = app.enum("payment_attempt_status", ['created', 'pending', 'requires_action', 'succeeded', 'failed', 'cancelled'])
export const paymentEvidenceStatusInApp = app.enum("payment_evidence_status", ['provider_verified', 'legacy_unverified', 'missing', 'manual_reconciliation'])
export const paymentStatusInApp = app.enum("payment_status", ['unverified', 'created', 'pending', 'requires_action', 'succeeded', 'failed', 'cancelled', 'partially_refunded', 'refunded'])
export const privacyDecisionOutcomeInApp = app.enum("privacy_decision_outcome", ['approved', 'rejected'])
export const privacyDecisionStageInApp = app.enum("privacy_decision_stage", ['employer', 'assigned_coordinator'])
export const privacyGrantStatusInApp = app.enum("privacy_grant_status", ['active', 'revoked', 'expired'])
export const privacyRequestStatusInApp = app.enum("privacy_request_status", ['awaiting_employer', 'awaiting_coordinator', 'approved', 'rejected', 'cancelled', 'expired'])
export const promotionalContentStatusInApp = app.enum("promotional_content_status", ['draft', 'published', 'archived'])
export const promotionalMediaKindInApp = app.enum("promotional_media_kind", ['image', 'video'])
export const registrationStatusInApp = app.enum("registration_status", ['pending_payment', 'confirmed', 'cancelled', 'payment_expired'])


export const userProfilesInApp = app.table("user_profiles", {
	applicationUserId: uuid("application_user_id").primaryKey().notNull(),
	fullName: text("full_name").notNull(),
	preferredName: text("preferred_name"),
	locale: text().default('he-IL').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.applicationUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_user_profiles_application_user"
		}).onDelete("restrict"),
	check("ck_user_profiles_full_name_nonempty", sql`btrim(full_name) <> ''::text`),
	check("ck_user_profiles_locale_nonempty", sql`btrim(locale) <> ''::text`),
]);

export const applicationUsersInApp = app.table("application_users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	primaryEmail: citext("primary_email").notNull(),
	status: applicationUserStatusInApp().default('invited').notNull(),
	emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deactivatedAt: timestamp("deactivated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	unique("uq_application_users_primary_email").on(table.primaryEmail),
	check("ck_application_users_deactivated_state", sql`((status = 'deactivated'::app.application_user_status) AND (deactivated_at IS NOT NULL)) OR ((status <> 'deactivated'::app.application_user_status) AND (deactivated_at IS NULL))`),
	check("ck_application_users_email_nonempty", sql`btrim((primary_email)::text) <> ''::text`),
]);

export const authIdentitiesInApp = app.table("auth_identities", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	applicationUserId: uuid("application_user_id").notNull(),
	provider: authIdentityProviderInApp().notNull(),
	providerSubject: text("provider_subject").notNull(),
	providerEmailSnapshot: citext("provider_email_snapshot"),
	linkedAt: timestamp("linked_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastAuthenticatedAt: timestamp("last_authenticated_at", { withTimezone: true, mode: 'string' }),
	retiredAt: timestamp("retired_at", { withTimezone: true, mode: 'string' }),
	metadata: jsonb().default({}).notNull(),
}, (table) => [
	index("ix_auth_identities_application_user").using("btree", table.applicationUserId.asc().nullsLast()),
	uniqueIndex("uq_auth_identities_active_user_provider").using("btree", table.applicationUserId.asc().nullsLast(), table.provider.asc().nullsLast()).where(sql`(retired_at IS NULL)`),
	foreignKey({
			columns: [table.applicationUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_auth_identities_application_user"
		}).onDelete("restrict"),
	unique("uq_auth_identities_provider_subject").on(table.provider, table.providerSubject),
	check("ck_auth_identities_subject_nonempty", sql`btrim(provider_subject) <> ''::text`),
]);

export const userRolesInApp = app.table("user_roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	applicationUserId: uuid("application_user_id").notNull(),
	roleId: uuid("role_id").notNull(),
	grantedByUserId: uuid("granted_by_user_id"),
	grantedAt: timestamp("granted_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	revokedByUserId: uuid("revoked_by_user_id"),
	revokedAt: timestamp("revoked_at", { withTimezone: true, mode: 'string' }),
	revocationReason: text("revocation_reason"),
}, (table) => [
	index("ix_user_roles_active_role").using("btree", table.roleId.asc().nullsLast(), table.applicationUserId.asc().nullsLast()).where(sql`(revoked_at IS NULL)`),
	uniqueIndex("uq_user_roles_active_assignment").using("btree", table.applicationUserId.asc().nullsLast(), table.roleId.asc().nullsLast()).where(sql`(revoked_at IS NULL)`),
	foreignKey({
			columns: [table.applicationUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_user_roles_application_user"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.grantedByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_user_roles_granted_by"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.revokedByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_user_roles_revoked_by"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [rolesInApp.id],
			name: "fk_user_roles_role"
		}).onDelete("restrict"),
	check("ck_user_roles_revocation", sql`((revoked_at IS NULL) AND (revoked_by_user_id IS NULL) AND (revocation_reason IS NULL)) OR ((revoked_at IS NOT NULL) AND (revoked_at >= granted_at) AND (revocation_reason IS NOT NULL) AND (btrim(revocation_reason) <> ''::text))`),
]);

export const rolesInApp = app.table("roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	description: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("uq_roles_code").on(table.code),
	check("ck_roles_code_nonempty", sql`btrim(code) <> ''::text`),
	check("ck_roles_description_nonempty", sql`btrim(description) <> ''::text`),
]);

export const coordinatorsInApp = app.table("coordinators", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	applicationUserId: uuid("application_user_id").notNull(),
	centerId: uuid("center_id").notNull(),
	title: text(),
	publicPhone: text("public_phone"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deactivatedAt: timestamp("deactivated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("ix_coordinators_center_active").using("btree", table.centerId.asc().nullsLast(), table.id.asc().nullsLast()).where(sql`is_active`),
	uniqueIndex("uq_coordinators_active_application_user").using("btree", table.applicationUserId.asc().nullsLast()).where(sql`is_active`),
	foreignKey({
			columns: [table.applicationUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_coordinators_application_user"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.centerId],
			foreignColumns: [centersInApp.id],
			name: "fk_coordinators_center"
		}).onDelete("restrict"),
	unique("uq_coordinators_id_center").on(table.id, table.centerId),
	check("ck_coordinators_active_state", sql`(is_active AND (deactivated_at IS NULL)) OR ((NOT is_active) AND (deactivated_at IS NOT NULL))`),
]);

export const centersInApp = app.table("centers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	status: centerStatusInApp().default('active').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	unique("uq_centers_code").on(table.code),
	unique("uq_centers_name").on(table.name),
	check("ck_centers_archive_state", sql`((status = 'inactive'::app.center_status) AND (archived_at IS NOT NULL)) OR ((status = 'active'::app.center_status) AND (archived_at IS NULL))`),
	check("ck_centers_code_nonempty", sql`btrim(code) <> ''::text`),
	check("ck_centers_name_nonempty", sql`btrim(name) <> ''::text`),
]);

export const mediaAssetsInApp = app.table("media_assets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	provider: mediaProviderInApp().default('cloudflare_r2').notNull(),
	bucketName: text("bucket_name").notNull(),
	objectKey: text("object_key").notNull(),
	originalFilename: text("original_filename"),
	contentType: text("content_type").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	byteSize: bigint("byte_size", { mode: "bigint" }),
	checksumSha256: text("checksum_sha256"),
	widthPixels: integer("width_pixels"),
	heightPixels: integer("height_pixels"),
	visibility: mediaVisibilityInApp().default('public').notNull(),
	status: mediaAssetStatusInApp().default('pending_upload').notNull(),
	uploadedByUserId: uuid("uploaded_by_user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	verifiedAt: timestamp("verified_at", { withTimezone: true, mode: 'string' }),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	deletionReason: text("deletion_reason"),
	metadata: jsonb().default({}).notNull(),
}, (table) => [
	index("ix_media_assets_status_created").using("btree", table.status.asc().nullsLast(), table.createdAt.asc().nullsLast()),
	foreignKey({
			columns: [table.uploadedByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_media_assets_uploaded_by"
		}).onDelete("set null"),
	unique("uq_media_assets_provider_object").on(table.provider, table.bucketName, table.objectKey),
	check("ck_media_assets_bucket_nonempty", sql`btrim(bucket_name) <> ''::text`),
	check("ck_media_assets_byte_size", sql`(byte_size IS NULL) OR (byte_size > 0)`),
	check("ck_media_assets_checksum", sql`(checksum_sha256 IS NULL) OR (checksum_sha256 ~ '^[0-9a-f]{64}$'::text)`),
	check("ck_media_assets_content_type_nonempty", sql`btrim(content_type) <> ''::text`),
	check("ck_media_assets_deleted_state", sql`((status = 'deleted'::app.media_asset_status) AND (deleted_at IS NOT NULL) AND (deletion_reason IS NOT NULL)) OR ((status <> 'deleted'::app.media_asset_status) AND (deleted_at IS NULL))`),
	check("ck_media_assets_dimensions", sql`((width_pixels IS NULL) OR (width_pixels > 0)) AND ((height_pixels IS NULL) OR (height_pixels > 0))`),
	check("ck_media_assets_object_key_nonempty", sql`btrim(object_key) <> ''::text`),
	check("ck_media_assets_ready_state", sql`(status <> 'ready'::app.media_asset_status) OR ((byte_size IS NOT NULL) AND (checksum_sha256 IS NOT NULL) AND (verified_at IS NOT NULL))`),
]);

export const employersInApp = app.table("employers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	displayName: text("display_name").notNull(),
	legalName: text("legal_name"),
	companyNumber: text("company_number"),
	address: text(),
	industry: text(),
	subindustry: text(),
	targetPopulation: text("target_population"),
	description: text(),
	jobsUrl: text("jobs_url"),
	logoMediaAssetId: uuid("logo_media_asset_id"),
	status: employerStatusInApp().default('prospect').notNull(),
	createdByUserId: uuid("created_by_user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("ix_employers_directory").using("btree", table.status.asc().nullsLast(), table.displayName.asc().nullsLast(), table.id.asc().nullsLast()).where(sql`(deleted_at IS NULL)`),
	index("ix_employers_industry").using("btree", table.industry.asc().nullsLast(), table.status.asc().nullsLast(), table.displayName.asc().nullsLast(), table.id.asc().nullsLast()).where(sql`((industry IS NOT NULL) AND (deleted_at IS NULL))`),
	index("ix_employers_logo_media_active").using("btree", table.logoMediaAssetId.asc().nullsLast()).where(sql`((logo_media_asset_id IS NOT NULL) AND (deleted_at IS NULL))`),
	uniqueIndex("uq_employers_company_number_active").using("btree", table.companyNumber.asc().nullsLast()).where(sql`((company_number IS NOT NULL) AND (deleted_at IS NULL))`),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_employers_created_by"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.logoMediaAssetId],
			foreignColumns: [mediaAssetsInApp.id],
			name: "fk_employers_logo_media"
		}).onDelete("restrict"),
	check("ck_employers_archive_state", sql`(status <> 'archived'::app.employer_status) OR (archived_at IS NOT NULL)`),
	check("ck_employers_display_name_nonempty", sql`btrim(display_name) <> ''::text`),
	check("ck_employers_jobs_url", sql`(jobs_url IS NULL) OR (jobs_url ~* '^https?://'::text)`),
]);

export const employerContactsInApp = app.table("employer_contacts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employerId: uuid("employer_id").notNull(),
	applicationUserId: uuid("application_user_id"),
	fullName: text("full_name").notNull(),
	positionTitle: text("position_title"),
	isPrimary: boolean("is_primary").default(false).notNull(),
	canManageEmployer: boolean("can_manage_employer").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("ix_employer_contacts_employer_active").using("btree", table.employerId.asc().nullsLast(), table.fullName.asc().nullsLast(), table.id.asc().nullsLast()).where(sql`(deleted_at IS NULL)`),
	uniqueIndex("uq_employer_contacts_active_user").using("btree", table.applicationUserId.asc().nullsLast()).where(sql`((application_user_id IS NOT NULL) AND (deleted_at IS NULL))`),
	uniqueIndex("uq_employer_contacts_primary_active").using("btree", table.employerId.asc().nullsLast()).where(sql`(is_primary AND (deleted_at IS NULL))`),
	foreignKey({
			columns: [table.applicationUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_employer_contacts_application_user"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.employerId],
			foreignColumns: [employersInApp.id],
			name: "fk_employer_contacts_employer"
		}).onDelete("restrict"),
	unique("uq_employer_contacts_id_employer").on(table.id, table.employerId),
	unique("uq_employer_contacts_id_employer_user").on(table.id, table.employerId, table.applicationUserId),
	check("ck_employer_contacts_full_name_nonempty", sql`btrim(full_name) <> ''::text`),
]);

export const employerPrivateInformationInApp = app.table("employer_private_information", {
	employerId: uuid("employer_id").primaryKey().notNull(),
	primaryContactId: uuid("primary_contact_id"),
	directEmail: citext("direct_email"),
	phone: text(),
	mobilePhone: text("mobile_phone"),
	notes: text(),
	updatedByUserId: uuid("updated_by_user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.employerId],
			foreignColumns: [employersInApp.id],
			name: "fk_employer_private_information_employer"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.employerId, table.primaryContactId],
			foreignColumns: [employerContactsInApp.id, employerContactsInApp.employerId],
			name: "fk_employer_private_information_primary_contact"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.updatedByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_employer_private_information_updated_by"
		}).onDelete("set null"),
	check("ck_employer_private_information_has_value", sql`(direct_email IS NOT NULL) OR (phone IS NOT NULL) OR (mobile_phone IS NOT NULL) OR (notes IS NOT NULL)`),
]);

export const employerContactInteractionsInApp = app.table("employer_contact_interactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employerId: uuid("employer_id").notNull(),
	employerContactId: uuid("employer_contact_id"),
	interactionKind: employerInteractionKindInApp("interaction_kind").notNull(),
	summary: text().notNull(),
	occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).notNull(),
	recordedByUserId: uuid("recorded_by_user_id"),
	recordedByCoordinatorId: uuid("recorded_by_coordinator_id"),
	recordedByIdentity: text("recorded_by_identity").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	sourceMetadata: jsonb("source_metadata").default({}).notNull(),
}, (table) => [
	index("ix_employer_contact_interactions_employer_time").using("btree", table.employerId.asc().nullsLast(), table.occurredAt.desc().nullsFirst(), table.id.desc().nullsFirst()),
	foreignKey({
			columns: [table.employerId, table.employerContactId],
			foreignColumns: [employerContactsInApp.id, employerContactsInApp.employerId],
			name: "fk_employer_contact_interactions_contact"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.recordedByCoordinatorId],
			foreignColumns: [coordinatorsInApp.id],
			name: "fk_employer_contact_interactions_coordinator"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.employerId],
			foreignColumns: [employersInApp.id],
			name: "fk_employer_contact_interactions_employer"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.recordedByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_employer_contact_interactions_user"
		}).onDelete("set null"),
	check("ck_employer_contact_interactions_actor_nonempty", sql`btrim(recorded_by_identity) <> ''::text`),
	check("ck_employer_contact_interactions_summary_nonempty", sql`btrim(summary) <> ''::text`),
]);

export const coordinatorAssignmentsInApp = app.table("coordinator_assignments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employerId: uuid("employer_id").notNull(),
	coordinatorId: uuid("coordinator_id").notNull(),
	centerId: uuid("center_id").notNull(),
	centerRelationshipId: uuid("center_relationship_id").notNull(),
	assignedByUserId: uuid("assigned_by_user_id").notNull(),
	assignedAt: timestamp("assigned_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	endedByUserId: uuid("ended_by_user_id"),
	endedAt: timestamp("ended_at", { withTimezone: true, mode: 'string' }),
	endReason: text("end_reason"),
}, (table) => [
	index("ix_coordinator_assignments_active_coordinator").using("btree", table.coordinatorId.asc().nullsLast(), table.employerId.asc().nullsLast()).where(sql`(ended_at IS NULL)`),
	uniqueIndex("uq_coordinator_assignments_active_employer").using("btree", table.employerId.asc().nullsLast()).where(sql`(ended_at IS NULL)`),
	foreignKey({
			columns: [table.assignedByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_coordinator_assignments_assigned_by"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.employerId, table.centerId, table.centerRelationshipId],
			foreignColumns: [employerCenterRelationshipsInApp.id, employerCenterRelationshipsInApp.employerId, employerCenterRelationshipsInApp.centerId],
			name: "fk_coordinator_assignments_center_relationship"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.coordinatorId, table.centerId],
			foreignColumns: [coordinatorsInApp.id, coordinatorsInApp.centerId],
			name: "fk_coordinator_assignments_coordinator_center"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.employerId],
			foreignColumns: [employersInApp.id],
			name: "fk_coordinator_assignments_employer"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.endedByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_coordinator_assignments_ended_by"
		}).onDelete("set null"),
	unique("uq_coordinator_assignments_identity").on(table.id, table.employerId, table.coordinatorId),
	check("ck_coordinator_assignments_end_state", sql`((ended_at IS NULL) AND (ended_by_user_id IS NULL) AND (end_reason IS NULL)) OR ((ended_at IS NOT NULL) AND (end_reason IS NOT NULL) AND (btrim(end_reason) <> ''::text))`),
	check("ck_coordinator_assignments_period", sql`(ended_at IS NULL) OR (ended_at >= assigned_at)`),
]);

export const employerCenterRelationshipsInApp = app.table("employer_center_relationships", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employerId: uuid("employer_id").notNull(),
	centerId: uuid("center_id").notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	endedAt: timestamp("ended_at", { withTimezone: true, mode: 'string' }),
	createdByUserId: uuid("created_by_user_id"),
	endedByUserId: uuid("ended_by_user_id"),
	endReason: text("end_reason"),
}, (table) => [
	index("ix_employer_center_relationships_center_active").using("btree", table.centerId.asc().nullsLast(), table.employerId.asc().nullsLast()).where(sql`(ended_at IS NULL)`),
	uniqueIndex("uq_employer_center_relationships_active_employer").using("btree", table.employerId.asc().nullsLast()).where(sql`(ended_at IS NULL)`),
	foreignKey({
			columns: [table.centerId],
			foreignColumns: [centersInApp.id],
			name: "fk_employer_center_relationships_center"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_employer_center_relationships_created_by"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.employerId],
			foreignColumns: [employersInApp.id],
			name: "fk_employer_center_relationships_employer"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.endedByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_employer_center_relationships_ended_by"
		}).onDelete("set null"),
	unique("uq_employer_center_relationships_identity").on(table.id, table.employerId, table.centerId),
	check("ck_employer_center_relationships_end_reason", sql`((ended_at IS NULL) AND (ended_by_user_id IS NULL) AND (end_reason IS NULL)) OR ((ended_at IS NOT NULL) AND (end_reason IS NOT NULL) AND (btrim(end_reason) <> ''::text))`),
	check("ck_employer_center_relationships_period", sql`(ended_at IS NULL) OR (ended_at >= started_at)`),
]);

export const privacyRequestsInApp = app.table("privacy_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	requesterCoordinatorId: uuid("requester_coordinator_id").notNull(),
	employerId: uuid("employer_id").notNull(),
	assignedCoordinatorId: uuid("assigned_coordinator_id"),
	coordinatorAssignmentId: uuid("coordinator_assignment_id"),
	status: privacyRequestStatusInApp().default('awaiting_employer').notNull(),
	purpose: text().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: 'string' }),
	cancellationReason: text("cancellation_reason"),
}, (table) => [
	index("ix_privacy_requests_assigned_status").using("btree", table.assignedCoordinatorId.asc().nullsLast(), table.status.asc().nullsLast(), table.createdAt.desc().nullsFirst()).where(sql`(assigned_coordinator_id IS NOT NULL)`),
	index("ix_privacy_requests_employer_status").using("btree", table.employerId.asc().nullsLast(), table.status.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
	index("ix_privacy_requests_pending_expiry").using("btree", table.expiresAt.asc().nullsLast()).where(sql`(status = ANY (ARRAY['awaiting_employer'::app.privacy_request_status, 'awaiting_coordinator'::app.privacy_request_status]))`),
	index("ix_privacy_requests_requester_status").using("btree", table.requesterCoordinatorId.asc().nullsLast(), table.status.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
	uniqueIndex("uq_privacy_requests_active_request").using("btree", table.employerId.asc().nullsLast(), table.requesterCoordinatorId.asc().nullsLast()).where(sql`(status = ANY (ARRAY['awaiting_employer'::app.privacy_request_status, 'awaiting_coordinator'::app.privacy_request_status]))`),
	foreignKey({
			columns: [table.employerId, table.assignedCoordinatorId, table.coordinatorAssignmentId],
			foreignColumns: [coordinatorAssignmentsInApp.id, coordinatorAssignmentsInApp.employerId, coordinatorAssignmentsInApp.coordinatorId],
			name: "fk_privacy_requests_assignment"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.employerId],
			foreignColumns: [employersInApp.id],
			name: "fk_privacy_requests_employer"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.requesterCoordinatorId],
			foreignColumns: [coordinatorsInApp.id],
			name: "fk_privacy_requests_requester"
		}).onDelete("restrict"),
	unique("uq_privacy_requests_source_identity").on(table.id, table.requesterCoordinatorId, table.employerId),
	check("ck_privacy_requests_assignment_shape", sql`((assigned_coordinator_id IS NULL) AND (coordinator_assignment_id IS NULL)) OR ((assigned_coordinator_id IS NOT NULL) AND (coordinator_assignment_id IS NOT NULL) AND (requester_coordinator_id <> assigned_coordinator_id))`),
	check("ck_privacy_requests_coordinator_state", sql`(status <> 'awaiting_coordinator'::app.privacy_request_status) OR (assigned_coordinator_id IS NOT NULL)`),
	check("ck_privacy_requests_expiry", sql`expires_at > created_at`),
	check("ck_privacy_requests_purpose_nonempty", sql`btrim(purpose) <> ''::text`),
	check("ck_privacy_requests_resolution_state", sql`((status = ANY (ARRAY['awaiting_employer'::app.privacy_request_status, 'awaiting_coordinator'::app.privacy_request_status])) AND (resolved_at IS NULL) AND (cancellation_reason IS NULL)) OR ((status = ANY (ARRAY['approved'::app.privacy_request_status, 'rejected'::app.privacy_request_status, 'expired'::app.privacy_request_status])) AND (resolved_at IS NOT NULL) AND (cancellation_reason IS NULL)) OR ((status = 'cancelled'::app.privacy_request_status) AND (resolved_at IS NOT NULL) AND (cancellation_reason IS NOT NULL) AND (btrim(cancellation_reason) <> ''::text))`),
]);

export const privacyRequestDecisionsInApp = app.table("privacy_request_decisions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	privacyRequestId: uuid("privacy_request_id").notNull(),
	stage: privacyDecisionStageInApp().notNull(),
	outcome: privacyDecisionOutcomeInApp().notNull(),
	decidedByUserId: uuid("decided_by_user_id").notNull(),
	reason: text(),
	decidedAt: timestamp("decided_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.privacyRequestId],
			foreignColumns: [privacyRequestsInApp.id],
			name: "fk_privacy_request_decisions_request"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.decidedByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_privacy_request_decisions_user"
		}).onDelete("restrict"),
	unique("uq_privacy_request_decisions_stage").on(table.privacyRequestId, table.stage),
]);

export const privacyAccessGrantsInApp = app.table("privacy_access_grants", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	employerId: uuid("employer_id").notNull(),
	granteeCoordinatorId: uuid("grantee_coordinator_id").notNull(),
	sourcePrivacyRequestId: uuid("source_privacy_request_id").notNull(),
	status: privacyGrantStatusInApp().default('active').notNull(),
	grantedByUserId: uuid("granted_by_user_id").notNull(),
	validFrom: timestamp("valid_from", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	revokedAt: timestamp("revoked_at", { withTimezone: true, mode: 'string' }),
	revokedByUserId: uuid("revoked_by_user_id"),
	revokedByIdentity: text("revoked_by_identity"),
	revocationReason: text("revocation_reason"),
	expiredAt: timestamp("expired_at", { withTimezone: true, mode: 'string' }),
	expiredByIdentity: text("expired_by_identity"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ix_privacy_access_grants_active_expiry").using("btree", table.expiresAt.asc().nullsLast(), table.id.asc().nullsLast()).where(sql`(status = 'active'::app.privacy_grant_status)`),
	uniqueIndex("uq_privacy_access_grants_active_pair").using("btree", table.employerId.asc().nullsLast(), table.granteeCoordinatorId.asc().nullsLast()).where(sql`(status = 'active'::app.privacy_grant_status)`),
	foreignKey({
			columns: [table.grantedByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_privacy_access_grants_granted_by"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.revokedByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_privacy_access_grants_revoked_by"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.employerId, table.granteeCoordinatorId, table.sourcePrivacyRequestId],
			foreignColumns: [privacyRequestsInApp.id, privacyRequestsInApp.requesterCoordinatorId, privacyRequestsInApp.employerId],
			name: "fk_privacy_access_grants_source"
		}).onDelete("restrict"),
	unique("uq_privacy_access_grants_source_request").on(table.sourcePrivacyRequestId),
	check("ck_privacy_access_grants_period", sql`expires_at > valid_from`),
	check("ck_privacy_access_grants_status_state", sql`((status = 'active'::app.privacy_grant_status) AND (revoked_at IS NULL) AND (revoked_by_user_id IS NULL) AND (revoked_by_identity IS NULL) AND (revocation_reason IS NULL) AND (expired_at IS NULL) AND (expired_by_identity IS NULL)) OR ((status = 'revoked'::app.privacy_grant_status) AND (revoked_at IS NOT NULL) AND (revoked_at >= valid_from) AND (revoked_by_identity IS NOT NULL) AND (btrim(revoked_by_identity) <> ''::text) AND (revocation_reason IS NOT NULL) AND (btrim(revocation_reason) <> ''::text) AND (expired_at IS NULL) AND (expired_by_identity IS NULL)) OR ((status = 'expired'::app.privacy_grant_status) AND (revoked_at IS NULL) AND (revoked_by_user_id IS NULL) AND (revoked_by_identity IS NULL) AND (revocation_reason IS NULL) AND (expired_at IS NOT NULL) AND (expired_at >= expires_at) AND (expired_by_identity IS NOT NULL) AND (btrim(expired_by_identity) <> ''::text))`),
]);

export const eventsInApp = app.table("events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	centerId: uuid("center_id").notNull(),
	creatorUserId: uuid("creator_user_id").notNull(),
	ownerCoordinatorId: uuid("owner_coordinator_id"),
	publicationStatus: eventPublicationStatusInApp("publication_status").default('draft').notNull(),
	title: text().notNull(),
	eventType: text("event_type"),
	description: text().notNull(),
	startsAt: timestamp("starts_at", { withTimezone: true, mode: 'string' }).notNull(),
	endsAt: timestamp("ends_at", { withTimezone: true, mode: 'string' }).notNull(),
	locationName: text("location_name"),
	locationUrl: text("location_url"),
	isOnline: boolean("is_online").default(false).notNull(),
	capacity: integer(),
	isAccessible: boolean("is_accessible").default(false).notNull(),
	accessibilityContactName: text("accessibility_contact_name"),
	accessibilityContactPhone: text("accessibility_contact_phone"),
	coordinatorContactName: text("coordinator_contact_name"),
	coordinatorContactPhone: text("coordinator_contact_phone"),
	paymentMode: eventPaymentModeInApp("payment_mode").default('free').notNull(),
	priceAmount: numeric("price_amount", { precision: 12, scale:  2 }).default('0').notNull(),
	currency: char({ length: 3 }).default('ILS').notNull(),
	paymentProvider: text("payment_provider"),
	paymentReference: text("payment_reference"),
	discountDetails: text("discount_details"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	reviewedByUserId: uuid("reviewed_by_user_id"),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	rejectionReason: text("rejection_reason"),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: 'string' }),
	cancelledByUserId: uuid("cancelled_by_user_id"),
	cancellationReason: text("cancellation_reason"),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	archivedByUserId: uuid("archived_by_user_id"),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	deletedByUserId: uuid("deleted_by_user_id"),
}, (table) => [
	index("ix_events_archive").using("btree", table.archivedAt.desc().nullsFirst(), table.id.asc().nullsLast()).where(sql`((archived_at IS NOT NULL) AND (deleted_at IS NULL))`),
	index("ix_events_center_status_start").using("btree", table.centerId.asc().nullsLast(), table.publicationStatus.asc().nullsLast(), table.startsAt.asc().nullsLast(), table.id.asc().nullsLast()).where(sql`(deleted_at IS NULL)`),
	index("ix_events_owner_status_start").using("btree", table.ownerCoordinatorId.asc().nullsLast(), table.publicationStatus.asc().nullsLast(), table.startsAt.asc().nullsLast(), table.id.asc().nullsLast()).where(sql`((owner_coordinator_id IS NOT NULL) AND (deleted_at IS NULL))`),
	index("ix_events_public_upcoming").using("btree", table.startsAt.asc().nullsLast(), table.id.asc().nullsLast()).where(sql`((publication_status = 'published'::app.event_publication_status) AND (archived_at IS NULL) AND (deleted_at IS NULL))`),
	foreignKey({
			columns: [table.archivedByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_events_archived_by"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.cancelledByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_events_cancelled_by"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.centerId],
			foreignColumns: [centersInApp.id],
			name: "fk_events_center"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.creatorUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_events_creator"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.deletedByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_events_deleted_by"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.centerId, table.ownerCoordinatorId],
			foreignColumns: [coordinatorsInApp.id, coordinatorsInApp.centerId],
			name: "fk_events_owner_coordinator_center"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.reviewedByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_events_reviewed_by"
		}).onDelete("set null"),
	check("ck_events_archive_state", sql`((archived_at IS NULL) AND (archived_by_user_id IS NULL)) OR ((archived_at IS NOT NULL) AND (archived_by_user_id IS NOT NULL))`),
	check("ck_events_cancelled_state", sql`(publication_status <> 'cancelled'::app.event_publication_status) OR ((cancelled_at IS NOT NULL) AND (cancellation_reason IS NOT NULL) AND (btrim(cancellation_reason) <> ''::text))`),
	check("ck_events_capacity", sql`(capacity IS NULL) OR (capacity >= 0)`),
	check("ck_events_currency", sql`currency ~ '^[A-Z]{3}$'::text`),
	check("ck_events_delete_state", sql`((deleted_at IS NULL) AND (deleted_by_user_id IS NULL)) OR ((deleted_at IS NOT NULL) AND (deleted_by_user_id IS NOT NULL))`),
	check("ck_events_description_nonempty", sql`btrim(description) <> ''::text`),
	check("ck_events_location_url", sql`(location_url IS NULL) OR (location_url ~* '^https?://'::text)`),
	check("ck_events_payment_configuration", sql`((payment_mode = 'free'::app.event_payment_mode) AND (price_amount = (0)::numeric) AND (payment_provider IS NULL) AND (payment_reference IS NULL)) OR ((payment_mode = 'external_link'::app.event_payment_mode) AND (price_amount > (0)::numeric) AND (payment_provider IS NULL) AND (payment_reference IS NOT NULL) AND (payment_reference ~* '^https?://'::text)) OR ((payment_mode = 'bit'::app.event_payment_mode) AND (price_amount > (0)::numeric) AND (payment_provider IS NULL) AND (payment_reference IS NOT NULL) AND (btrim(payment_reference) <> ''::text)) OR ((payment_mode = 'provider'::app.event_payment_mode) AND (price_amount > (0)::numeric) AND (payment_provider IS NOT NULL) AND (btrim(payment_provider) <> ''::text))`),
	check("ck_events_price", sql`price_amount >= (0)::numeric`),
	check("ck_events_published_state", sql`(publication_status <> 'published'::app.event_publication_status) OR (published_at IS NOT NULL)`),
	check("ck_events_rejected_state", sql`(publication_status <> 'rejected'::app.event_publication_status) OR ((reviewed_at IS NOT NULL) AND (rejection_reason IS NOT NULL) AND (btrim(rejection_reason) <> ''::text))`),
	check("ck_events_time_range", sql`ends_at > starts_at`),
	check("ck_events_title_nonempty", sql`btrim(title) <> ''::text`),
]);

export const eventPublicationHistoryInApp = app.table("event_publication_history", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity({
		maxValue: "9223372036854775807",
	}),
	eventId: uuid("event_id").notNull(),
	fromStatus: eventPublicationStatusInApp("from_status"),
	toStatus: eventPublicationStatusInApp("to_status").notNull(),
	changedByUserId: uuid("changed_by_user_id"),
	reason: text(),
	changedAt: timestamp("changed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ix_event_publication_history_event_time").using("btree", table.eventId.asc().nullsLast(), table.changedAt.desc().nullsFirst()),
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [eventsInApp.id],
			name: "fk_event_publication_history_event"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.changedByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_event_publication_history_user"
		}).onDelete("set null"),
	check("ck_event_publication_history_transition", sql`(from_status IS NULL) OR (from_status <> to_status)`),
]);

export const eventRegistrationsInApp = app.table("event_registrations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	eventId: uuid("event_id").notNull(),
	employerId: uuid("employer_id").notNull(),
	cycleNumber: integer("cycle_number").notNull(),
	submittedByContactId: uuid("submitted_by_contact_id").notNull(),
	submittedByUserId: uuid("submitted_by_user_id").notNull(),
	status: registrationStatusInApp().notNull(),
	registeredAt: timestamp("registered_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	capacityHoldExpiresAt: timestamp("capacity_hold_expires_at", { withTimezone: true, mode: 'string' }),
	confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: 'string' }),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: 'string' }),
	cancelledByUserId: uuid("cancelled_by_user_id"),
	cancellationReason: text("cancellation_reason"),
	paymentExpiredAt: timestamp("payment_expired_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ix_event_registrations_active_hold_expiry").using("btree", table.capacityHoldExpiresAt.asc().nullsLast(), table.id.asc().nullsLast()).where(sql`(status = 'pending_payment'::app.registration_status)`),
	index("ix_event_registrations_employer_time").using("btree", table.employerId.asc().nullsLast(), table.registeredAt.desc().nullsFirst(), table.id.desc().nullsFirst()),
	index("ix_event_registrations_event_status").using("btree", table.eventId.asc().nullsLast(), table.status.asc().nullsLast(), table.registeredAt.desc().nullsFirst(), table.id.desc().nullsFirst()),
	index("ix_event_registrations_user_time").using("btree", table.submittedByUserId.asc().nullsLast(), table.registeredAt.desc().nullsFirst(), table.id.desc().nullsFirst()),
	uniqueIndex("uq_event_registrations_active_employer").using("btree", table.eventId.asc().nullsLast(), table.employerId.asc().nullsLast()).where(sql`(status = ANY (ARRAY['pending_payment'::app.registration_status, 'confirmed'::app.registration_status]))`),
	foreignKey({
			columns: [table.cancelledByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_event_registrations_cancelled_by"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.employerId],
			foreignColumns: [employersInApp.id],
			name: "fk_event_registrations_employer"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [eventsInApp.id],
			name: "fk_event_registrations_event"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.employerId, table.submittedByContactId, table.submittedByUserId],
			foreignColumns: [employerContactsInApp.id, employerContactsInApp.employerId, employerContactsInApp.applicationUserId],
			name: "fk_event_registrations_submitting_contact"
		}).onDelete("restrict"),
	unique("uq_event_registrations_cycle").on(table.eventId, table.employerId, table.cycleNumber),
	check("ck_event_registrations_cancelled_state", sql`((status = 'cancelled'::app.registration_status) AND (cancelled_at IS NOT NULL) AND (cancellation_reason IS NOT NULL) AND (btrim(cancellation_reason) <> ''::text) AND (payment_expired_at IS NULL)) OR ((status <> 'cancelled'::app.registration_status) AND (cancelled_at IS NULL) AND (cancelled_by_user_id IS NULL) AND (cancellation_reason IS NULL))`),
	check("ck_event_registrations_confirmed_state", sql`(status <> 'confirmed'::app.registration_status) OR (confirmed_at IS NOT NULL)`),
	check("ck_event_registrations_cycle_positive", sql`cycle_number > 0`),
	check("ck_event_registrations_hold_state", sql`(status <> 'pending_payment'::app.registration_status) OR ((capacity_hold_expires_at IS NOT NULL) AND (capacity_hold_expires_at > registered_at) AND (confirmed_at IS NULL) AND (payment_expired_at IS NULL))`),
	check("ck_event_registrations_payment_expired_state", sql`((status = 'payment_expired'::app.registration_status) AND (capacity_hold_expires_at IS NOT NULL) AND (payment_expired_at IS NOT NULL) AND (payment_expired_at >= capacity_hold_expires_at) AND (confirmed_at IS NULL)) OR ((status <> 'payment_expired'::app.registration_status) AND (payment_expired_at IS NULL))`),
]);

export const paymentsInApp = app.table("payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	registrationId: uuid("registration_id").notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	currency: char({ length: 3 }).default('ILS').notNull(),
	status: paymentStatusInApp().default('created').notNull(),
	evidenceStatus: paymentEvidenceStatusInApp("evidence_status").default('provider_verified').notNull(),
	evidenceReference: text("evidence_reference"),
	provider: text(),
	providerPaymentReference: text("provider_payment_reference"),
	idempotencyKey: text("idempotency_key"),
	refundedAmount: numeric("refunded_amount", { precision: 12, scale:  2 }).default('0').notNull(),
	reconciledByUserId: uuid("reconciled_by_user_id"),
	reconciledByIdentity: text("reconciled_by_identity"),
	reconciledAt: timestamp("reconciled_at", { withTimezone: true, mode: 'string' }),
	reconciliationReason: text("reconciliation_reason"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	succeededAt: timestamp("succeeded_at", { withTimezone: true, mode: 'string' }),
	failedAt: timestamp("failed_at", { withTimezone: true, mode: 'string' }),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	uniqueIndex("uq_payments_provider_reference").using("btree", table.provider.asc().nullsLast(), table.providerPaymentReference.asc().nullsLast()).where(sql`(provider_payment_reference IS NOT NULL)`),
	foreignKey({
			columns: [table.reconciledByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_payments_reconciled_by"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.registrationId],
			foreignColumns: [eventRegistrationsInApp.id],
			name: "fk_payments_registration"
		}).onDelete("restrict"),
	unique("uq_payments_registration").on(table.registrationId),
	unique("uq_payments_idempotency_key").on(table.idempotencyKey),
	check("ck_payments_amount", sql`amount > (0)::numeric`),
	check("ck_payments_cancelled_state", sql`((status = 'cancelled'::app.payment_status) AND (cancelled_at IS NOT NULL)) OR ((status <> 'cancelled'::app.payment_status) AND (cancelled_at IS NULL))`),
	check("ck_payments_currency", sql`currency ~ '^[A-Z]{3}$'::text`),
	check("ck_payments_evidence_reference_nonempty", sql`(evidence_reference IS NULL) OR (btrim(evidence_reference) <> ''::text)`),
	check("ck_payments_evidence_state", sql`((evidence_status = 'provider_verified'::app.payment_evidence_status) AND (status <> 'unverified'::app.payment_status) AND (provider IS NOT NULL) AND (idempotency_key IS NOT NULL) AND (reconciled_by_user_id IS NULL) AND (reconciled_by_identity IS NULL) AND (reconciled_at IS NULL) AND (reconciliation_reason IS NULL)) OR ((evidence_status = ANY (ARRAY['legacy_unverified'::app.payment_evidence_status, 'missing'::app.payment_evidence_status])) AND (status = 'unverified'::app.payment_status) AND (provider_payment_reference IS NULL) AND (succeeded_at IS NULL) AND (reconciled_by_user_id IS NULL) AND (reconciled_by_identity IS NULL) AND (reconciled_at IS NULL) AND (reconciliation_reason IS NULL)) OR ((evidence_status = 'manual_reconciliation'::app.payment_evidence_status) AND (status <> 'unverified'::app.payment_status) AND (reconciled_by_identity IS NOT NULL) AND (btrim(reconciled_by_identity) <> ''::text) AND (reconciled_at IS NOT NULL) AND (reconciliation_reason IS NOT NULL) AND (btrim(reconciliation_reason) <> ''::text))`),
	check("ck_payments_failed_state", sql`((status = 'failed'::app.payment_status) AND (failed_at IS NOT NULL)) OR ((status <> 'failed'::app.payment_status) AND (failed_at IS NULL))`),
	check("ck_payments_idempotency_nonempty", sql`(idempotency_key IS NULL) OR (btrim(idempotency_key) <> ''::text)`),
	check("ck_payments_provider_nonempty", sql`(provider IS NULL) OR (btrim(provider) <> ''::text)`),
	check("ck_payments_refund_amount", sql`(refunded_amount >= (0)::numeric) AND (refunded_amount <= amount)`),
	check("ck_payments_refund_state", sql`((status = 'partially_refunded'::app.payment_status) AND (refunded_amount > (0)::numeric) AND (refunded_amount < amount)) OR ((status = 'refunded'::app.payment_status) AND (refunded_amount = amount)) OR ((status <> ALL (ARRAY['partially_refunded'::app.payment_status, 'refunded'::app.payment_status])) AND (refunded_amount = (0)::numeric))`),
	check("ck_payments_status_timestamps", sql`((status = ANY (ARRAY['succeeded'::app.payment_status, 'partially_refunded'::app.payment_status, 'refunded'::app.payment_status])) AND (succeeded_at IS NOT NULL)) OR ((status <> ALL (ARRAY['succeeded'::app.payment_status, 'partially_refunded'::app.payment_status, 'refunded'::app.payment_status])) AND (succeeded_at IS NULL))`),
]);

export const paymentAttemptsInApp = app.table("payment_attempts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	paymentId: uuid("payment_id").notNull(),
	attemptNumber: integer("attempt_number").notNull(),
	status: paymentAttemptStatusInApp().default('created').notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	currency: char({ length: 3 }).notNull(),
	provider: text().notNull(),
	providerAttemptReference: text("provider_attempt_reference"),
	idempotencyKey: text("idempotency_key").notNull(),
	errorCode: text("error_code"),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	uniqueIndex("uq_payment_attempts_provider_reference").using("btree", table.provider.asc().nullsLast(), table.providerAttemptReference.asc().nullsLast()).where(sql`(provider_attempt_reference IS NOT NULL)`),
	foreignKey({
			columns: [table.paymentId],
			foreignColumns: [paymentsInApp.id],
			name: "fk_payment_attempts_payment"
		}).onDelete("restrict"),
	unique("uq_payment_attempts_number").on(table.paymentId, table.attemptNumber),
	unique("uq_payment_attempts_idempotency_key").on(table.idempotencyKey),
	check("ck_payment_attempts_amount", sql`amount > (0)::numeric`),
	check("ck_payment_attempts_completed_state", sql`(status = ANY (ARRAY['created'::app.payment_attempt_status, 'pending'::app.payment_attempt_status, 'requires_action'::app.payment_attempt_status])) OR (completed_at IS NOT NULL)`),
	check("ck_payment_attempts_currency", sql`currency ~ '^[A-Z]{3}$'::text`),
	check("ck_payment_attempts_idempotency_nonempty", sql`btrim(idempotency_key) <> ''::text`),
	check("ck_payment_attempts_number", sql`attempt_number > 0`),
	check("ck_payment_attempts_provider_nonempty", sql`btrim(provider) <> ''::text`),
]);

export const contentScrapeRunsInApp = app.table("content_scrape_runs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	triggeredByUserId: uuid("triggered_by_user_id"),
	status: contentScrapeRunStatusInApp().default('running').notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	sourcesAttempted: integer("sources_attempted").default(0).notNull(),
	articlesDiscovered: integer("articles_discovered").default(0).notNull(),
	articlesUpserted: integer("articles_upserted").default(0).notNull(),
	errors: jsonb().default([]).notNull(),
}, (table) => [
	index("ix_content_scrape_runs_started").using("btree", table.startedAt.desc().nullsFirst()),
	foreignKey({
			columns: [table.triggeredByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_content_scrape_runs_triggered_by"
		}).onDelete("set null"),
	check("ck_content_scrape_runs_completion", sql`(status = 'running'::app.content_scrape_run_status) OR (completed_at IS NOT NULL)`),
	check("ck_content_scrape_runs_counts", sql`(sources_attempted >= 0) AND (articles_discovered >= 0) AND (articles_upserted >= 0)`),
]);

export const paymentWebhookEventsInApp = app.table("payment_webhook_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	provider: text().notNull(),
	providerEventId: text("provider_event_id").notNull(),
	paymentId: uuid("payment_id"),
	paymentAttemptId: uuid("payment_attempt_id"),
	signatureValid: boolean("signature_valid").notNull(),
	payload: jsonb().notNull(),
	receivedAt: timestamp("received_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }),
	processingError: text("processing_error"),
}, (table) => [
	index("ix_payment_webhook_events_unprocessed").using("btree", table.receivedAt.asc().nullsLast()).where(sql`(processed_at IS NULL)`),
	foreignKey({
			columns: [table.paymentAttemptId],
			foreignColumns: [paymentAttemptsInApp.id],
			name: "fk_payment_webhook_events_attempt"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.paymentId],
			foreignColumns: [paymentsInApp.id],
			name: "fk_payment_webhook_events_payment"
		}).onDelete("restrict"),
	unique("uq_payment_webhook_events_provider_event").on(table.provider, table.providerEventId),
	check("ck_payment_webhook_events_event_nonempty", sql`btrim(provider_event_id) <> ''::text`),
	check("ck_payment_webhook_events_provider_nonempty", sql`btrim(provider) <> ''::text`),
]);

export const contentKeywordsInApp = app.table("content_keywords", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	keyword: text().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdByUserId: uuid("created_by_user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_content_keywords_created_by"
		}).onDelete("set null"),
	unique("uq_content_keywords_keyword").on(table.keyword),
	check("ck_content_keywords_keyword_nonempty", sql`btrim(keyword) <> ''::text`),
]);

export const notificationsInApp = app.table("notifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	recipientUserId: uuid("recipient_user_id").notNull(),
	actorUserId: uuid("actor_user_id"),
	notificationType: text("notification_type").notNull(),
	title: text().notNull(),
	body: text().notNull(),
	linkPath: text("link_path"),
	subjectType: text("subject_type"),
	subjectId: text("subject_id"),
	payload: jsonb().default({}).notNull(),
	deduplicationKey: text("deduplication_key"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	readAt: timestamp("read_at", { withTimezone: true, mode: 'string' }),
	dismissedAt: timestamp("dismissed_at", { withTimezone: true, mode: 'string' }),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("ix_notifications_recipient_created").using("btree", table.recipientUserId.asc().nullsLast(), table.createdAt.desc().nullsFirst(), table.id.asc().nullsLast()).where(sql`(deleted_at IS NULL)`),
	index("ix_notifications_recipient_unread").using("btree", table.recipientUserId.asc().nullsLast(), table.createdAt.desc().nullsFirst(), table.id.asc().nullsLast()).where(sql`((read_at IS NULL) AND (deleted_at IS NULL))`),
	uniqueIndex("uq_notifications_deduplication_key").using("btree", table.recipientUserId.asc().nullsLast(), table.deduplicationKey.asc().nullsLast()).where(sql`((deduplication_key IS NOT NULL) AND (deleted_at IS NULL))`),
	foreignKey({
			columns: [table.actorUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_notifications_actor"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.recipientUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_notifications_recipient"
		}).onDelete("restrict"),
	check("ck_notifications_body_nonempty", sql`btrim(body) <> ''::text`),
	check("ck_notifications_link_path", sql`(link_path IS NULL) OR ("left"(link_path, 1) = '/'::text)`),
	check("ck_notifications_title_nonempty", sql`btrim(title) <> ''::text`),
	check("ck_notifications_type_nonempty", sql`btrim(notification_type) <> ''::text`),
]);

export const contentSourcesInApp = app.table("content_sources", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	sourceUrl: text("source_url").notNull(),
	selector: text().default('a').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdByUserId: uuid("created_by_user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_content_sources_created_by"
		}).onDelete("set null"),
	unique("uq_content_sources_url").on(table.sourceUrl),
	check("ck_content_sources_name_nonempty", sql`btrim(name) <> ''::text`),
	check("ck_content_sources_selector_nonempty", sql`btrim(selector) <> ''::text`),
	check("ck_content_sources_url", sql`source_url ~* '^https?://'::text`),
]);

export const articlesInApp = app.table("articles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	origin: articleOriginInApp().notNull(),
	sourceId: uuid("source_id"),
	scrapeRunId: uuid("scrape_run_id"),
	authorUserId: uuid("author_user_id"),
	title: text().notNull(),
	sourceName: text("source_name"),
	sourceUrl: text("source_url"),
	sourceUrlSha256: text("source_url_sha256"),
	category: text(),
	excerpt: text(),
	body: text(),
	externalImageUrl: text("external_image_url"),
	heroMediaAssetId: uuid("hero_media_asset_id"),
	status: articleStatusInApp().default('draft').notNull(),
	submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }),
	reviewedByUserId: uuid("reviewed_by_user_id"),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	rejectionReason: text("rejection_reason"),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("ix_articles_author_status").using("btree", table.authorUserId.asc().nullsLast(), table.status.asc().nullsLast(), table.createdAt.desc().nullsFirst()).where(sql`((author_user_id IS NOT NULL) AND (deleted_at IS NULL))`),
	index("ix_articles_hero_media_active").using("btree", table.heroMediaAssetId.asc().nullsLast()).where(sql`((hero_media_asset_id IS NOT NULL) AND (deleted_at IS NULL))`),
	index("ix_articles_moderation_queue").using("btree", table.status.asc().nullsLast(), table.submittedAt.asc().nullsLast(), table.id.asc().nullsLast()).where(sql`((status = ANY (ARRAY['pending_review'::app.article_status, 'rejected'::app.article_status])) AND (deleted_at IS NULL))`),
	index("ix_articles_publication_feed").using("btree", table.publishedAt.desc().nullsFirst(), table.id.asc().nullsLast()).where(sql`((status = 'published'::app.article_status) AND (deleted_at IS NULL))`),
	uniqueIndex("uq_articles_source_url_hash_active").using("btree", table.sourceUrlSha256.asc().nullsLast()).where(sql`((source_url_sha256 IS NOT NULL) AND (deleted_at IS NULL))`),
	foreignKey({
			columns: [table.authorUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_articles_author"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.heroMediaAssetId],
			foreignColumns: [mediaAssetsInApp.id],
			name: "fk_articles_hero_media"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.reviewedByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_articles_reviewer"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.scrapeRunId],
			foreignColumns: [contentScrapeRunsInApp.id],
			name: "fk_articles_scrape_run"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.sourceId],
			foreignColumns: [contentSourcesInApp.id],
			name: "fk_articles_source"
		}).onDelete("restrict"),
	check("ck_articles_archived_state", sql`(status <> 'archived'::app.article_status) OR (archived_at IS NOT NULL)`),
	check("ck_articles_external_image_url", sql`(external_image_url IS NULL) OR (external_image_url ~* '^https?://'::text)`),
	check("ck_articles_pending_state", sql`(status <> 'pending_review'::app.article_status) OR (submitted_at IS NOT NULL)`),
	check("ck_articles_published_state", sql`(status <> 'published'::app.article_status) OR ((published_at IS NOT NULL) AND (reviewed_at IS NOT NULL) AND (reviewed_by_user_id IS NOT NULL))`),
	check("ck_articles_rejected_state", sql`(status <> 'rejected'::app.article_status) OR ((reviewed_at IS NOT NULL) AND (rejection_reason IS NOT NULL) AND (btrim(rejection_reason) <> ''::text))`),
	check("ck_articles_source_url_pair", sql`((source_url IS NULL) AND (source_url_sha256 IS NULL)) OR ((source_url IS NOT NULL) AND (source_url_sha256 IS NOT NULL) AND (source_url ~* '^https?://'::text) AND (source_url_sha256 ~ '^[0-9a-f]{64}$'::text))`),
	check("ck_articles_title_nonempty", sql`btrim(title) <> ''::text`),
]);

export const articleStatusHistoryInApp = app.table("article_status_history", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity({
		maxValue: "9223372036854775807",
	}),
	articleId: uuid("article_id").notNull(),
	fromStatus: articleStatusInApp("from_status"),
	toStatus: articleStatusInApp("to_status").notNull(),
	changedByUserId: uuid("changed_by_user_id"),
	reason: text(),
	changedAt: timestamp("changed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ix_article_status_history_article_time").using("btree", table.articleId.asc().nullsLast(), table.changedAt.desc().nullsFirst()),
	foreignKey({
			columns: [table.articleId],
			foreignColumns: [articlesInApp.id],
			name: "fk_article_status_history_article"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.changedByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_article_status_history_user"
		}).onDelete("set null"),
	check("ck_article_status_history_transition", sql`(from_status IS NULL) OR (from_status <> to_status)`),
]);

export const dataMigrationRunsInApp = app.table("data_migration_runs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sourceSystem: text("source_system").notNull(),
	domain: text().notNull(),
	status: migrationRunStatusInApp().default('running').notNull(),
	sourceSnapshotUri: text("source_snapshot_uri"),
	sourceManifestSha256: text("source_manifest_sha256"),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sourceRecordCount: bigint("source_record_count", { mode: "bigint" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	importedRecordCount: bigint("imported_record_count", { mode: "bigint" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	rejectedRecordCount: bigint("rejected_record_count", { mode: "bigint" }).default(sql`0`).notNull(),
	reconciliation: jsonb().default({}).notNull(),
	notes: text(),
}, (_table) => [
	check("ck_data_migration_runs_completion", sql`(status = 'running'::app.migration_run_status) OR (completed_at IS NOT NULL)`),
	check("ck_data_migration_runs_counts", sql`((source_record_count IS NULL) OR (source_record_count >= 0)) AND ((imported_record_count IS NULL) OR (imported_record_count >= 0)) AND (rejected_record_count >= 0)`),
	check("ck_data_migration_runs_domain_nonempty", sql`btrim(domain) <> ''::text`),
	check("ck_data_migration_runs_source_nonempty", sql`btrim(source_system) <> ''::text`),
]);

export const promotionalContentItemsInApp = app.table("promotional_content_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	mediaKind: promotionalMediaKindInApp("media_kind").notNull(),
	mediaAssetId: uuid("media_asset_id"),
	externalMediaUrl: text("external_media_url"),
	audienceRoleId: uuid("audience_role_id"),
	status: promotionalContentStatusInApp().default('draft').notNull(),
	displayOrder: integer("display_order").default(0).notNull(),
	createdByUserId: uuid("created_by_user_id").notNull(),
	updatedByUserId: uuid("updated_by_user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("ix_promotional_content_active_order").using("btree", table.audienceRoleId.asc().nullsLast(), table.displayOrder.asc().nullsLast(), table.id.asc().nullsLast()).where(sql`((status = 'published'::app.promotional_content_status) AND (deleted_at IS NULL))`),
	index("ix_promotional_content_media_active").using("btree", table.mediaAssetId.asc().nullsLast()).where(sql`((media_asset_id IS NOT NULL) AND (deleted_at IS NULL))`),
	foreignKey({
			columns: [table.audienceRoleId],
			foreignColumns: [rolesInApp.id],
			name: "fk_promotional_content_audience_role"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_promotional_content_created_by"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.mediaAssetId],
			foreignColumns: [mediaAssetsInApp.id],
			name: "fk_promotional_content_media"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.updatedByUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_promotional_content_updated_by"
		}).onDelete("restrict"),
	check("ck_promotional_content_archived_state", sql`(status <> 'archived'::app.promotional_content_status) OR (archived_at IS NOT NULL)`),
	check("ck_promotional_content_description_nonempty", sql`btrim(description) <> ''::text`),
	check("ck_promotional_content_display_order", sql`display_order >= 0`),
	check("ck_promotional_content_media_source", sql`((media_asset_id IS NOT NULL) AND (external_media_url IS NULL)) OR ((media_asset_id IS NULL) AND (external_media_url IS NOT NULL) AND (external_media_url ~* '^https?://'::text))`),
	check("ck_promotional_content_published_state", sql`(status <> 'published'::app.promotional_content_status) OR (published_at IS NOT NULL)`),
	check("ck_promotional_content_title_nonempty", sql`btrim(title) <> ''::text`),
]);

export const legacyRecordMappingsInApp = app.table("legacy_record_mappings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sourceSystem: text("source_system").notNull(),
	sourceDocumentPath: text("source_document_path").notNull(),
	targetTable: text("target_table").notNull(),
	targetPrimaryKey: text("target_primary_key").notNull(),
	firstMigrationRunId: uuid("first_migration_run_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ix_legacy_record_mappings_target").using("btree", table.targetTable.asc().nullsLast(), table.targetPrimaryKey.asc().nullsLast()),
	foreignKey({
			columns: [table.firstMigrationRunId],
			foreignColumns: [dataMigrationRunsInApp.id],
			name: "fk_legacy_record_mappings_first_run"
		}).onDelete("restrict"),
	unique("uq_legacy_record_mappings_source_target").on(table.sourceSystem, table.sourceDocumentPath, table.targetTable, table.targetPrimaryKey),
	check("ck_legacy_record_mappings_path_nonempty", sql`btrim(source_document_path) <> ''::text`),
	check("ck_legacy_record_mappings_source_nonempty", sql`btrim(source_system) <> ''::text`),
	check("ck_legacy_record_mappings_target_nonempty", sql`(btrim(target_table) <> ''::text) AND (btrim(target_primary_key) <> ''::text)`),
]);

export const auditLogsInApp = app.table("audit_logs", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity({
		maxValue: "9223372036854775807",
	}),
	actorUserId: uuid("actor_user_id"),
	actorIdentity: text("actor_identity").notNull(),
	action: text().notNull(),
	subjectType: text("subject_type").notNull(),
	subjectId: text("subject_id").notNull(),
	requestId: uuid("request_id"),
	ipAddress: inet("ip_address"),
	userAgent: text("user_agent"),
	beforeState: jsonb("before_state"),
	afterState: jsonb("after_state"),
	metadata: jsonb().default({}).notNull(),
	occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ix_audit_logs_actor_time").using("btree", table.actorUserId.asc().nullsLast(), table.occurredAt.desc().nullsFirst(), table.id.desc().nullsFirst()).where(sql`(actor_user_id IS NOT NULL)`),
	index("ix_audit_logs_occurred_time").using("btree", table.occurredAt.desc().nullsFirst(), table.id.desc().nullsFirst()),
	index("ix_audit_logs_request").using("btree", table.requestId.asc().nullsLast()).where(sql`(request_id IS NOT NULL)`),
	index("ix_audit_logs_subject_time").using("btree", table.subjectType.asc().nullsLast(), table.subjectId.asc().nullsLast(), table.occurredAt.desc().nullsFirst(), table.id.desc().nullsFirst()),
	foreignKey({
			columns: [table.actorUserId],
			foreignColumns: [applicationUsersInApp.id],
			name: "fk_audit_logs_actor"
		}).onDelete("set null"),
	check("ck_audit_logs_action_nonempty", sql`btrim(action) <> ''::text`),
	check("ck_audit_logs_actor_identity_nonempty", sql`btrim(actor_identity) <> ''::text`),
	check("ck_audit_logs_subject_id_nonempty", sql`btrim(subject_id) <> ''::text`),
	check("ck_audit_logs_subject_type_nonempty", sql`btrim(subject_type) <> ''::text`),
]);

export const dataMigrationRunItemsInApp = app.table("data_migration_run_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	migrationRunId: uuid("migration_run_id").notNull(),
	sourceSystem: text("source_system").notNull(),
	sourceDocumentPath: text("source_document_path").notNull(),
	itemKey: text("item_key").notNull(),
	sourcePayloadSha256: text("source_payload_sha256").notNull(),
	outcome: migrationRunItemOutcomeInApp().notNull(),
	canonicalMappingId: uuid("canonical_mapping_id"),
	validationErrors: jsonb("validation_errors").default([]).notNull(),
	details: jsonb().default({}).notNull(),
	recordedAt: timestamp("recorded_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ix_data_migration_run_items_run").using("btree", table.migrationRunId.asc().nullsLast(), table.outcome.asc().nullsLast(), table.sourceDocumentPath.asc().nullsLast(), table.id.asc().nullsLast()),
	foreignKey({
			columns: [table.canonicalMappingId],
			foreignColumns: [legacyRecordMappingsInApp.id],
			name: "fk_data_migration_run_items_mapping"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.migrationRunId],
			foreignColumns: [dataMigrationRunsInApp.id],
			name: "fk_data_migration_run_items_run"
		}).onDelete("restrict"),
	unique("uq_data_migration_run_items_identity").on(table.migrationRunId, table.sourceSystem, table.sourceDocumentPath, table.itemKey),
	check("ck_data_migration_run_items_checksum", sql`source_payload_sha256 ~ '^[0-9a-f]{64}$'::text`),
	check("ck_data_migration_run_items_mapping_state", sql`((outcome = ANY (ARRAY['mapped'::app.migration_run_item_outcome, 'unchanged'::app.migration_run_item_outcome])) AND (canonical_mapping_id IS NOT NULL)) OR ((outcome = ANY (ARRAY['quarantined'::app.migration_run_item_outcome, 'conflict'::app.migration_run_item_outcome, 'rejected'::app.migration_run_item_outcome, 'archived'::app.migration_run_item_outcome])) AND (canonical_mapping_id IS NULL))`),
	check("ck_data_migration_run_items_source_nonempty", sql`(btrim(source_system) <> ''::text) AND (btrim(source_document_path) <> ''::text) AND (btrim(item_key) <> ''::text)`),
]);

export const eventMediaInApp = app.table("event_media", {
	eventId: uuid("event_id").notNull(),
	mediaAssetId: uuid("media_asset_id").notNull(),
	purpose: eventMediaPurposeInApp().default('gallery').notNull(),
	displayOrder: integer("display_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ix_event_media_asset").using("btree", table.mediaAssetId.asc().nullsLast(), table.eventId.asc().nullsLast()),
	foreignKey({
			columns: [table.mediaAssetId],
			foreignColumns: [mediaAssetsInApp.id],
			name: "fk_event_media_asset"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [eventsInApp.id],
			name: "fk_event_media_event"
		}).onDelete("restrict"),
	primaryKey({ columns: [table.eventId, table.mediaAssetId], name: "event_media_pkey"}),
	unique("uq_event_media_position").on(table.eventId, table.purpose, table.displayOrder),
	check("ck_event_media_display_order", sql`display_order >= 0`),
]);
