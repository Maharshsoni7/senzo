CREATE TABLE `booking_events` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`from_state` text,
	`to_state` text NOT NULL,
	`actor` text NOT NULL,
	`actor_id` text,
	`reason` text,
	`at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "from_state_valid" CHECK("booking_events"."from_state" IN ('payment_pending', 'requested', 'confirmed', 'in_progress', 'completed', 'paid_out', 'declined', 'cancelled', 'no_show', 'disputed', 'refunded', 'expired')),
	CONSTRAINT "to_state_valid" CHECK("booking_events"."to_state" IN ('payment_pending', 'requested', 'confirmed', 'in_progress', 'completed', 'paid_out', 'declined', 'cancelled', 'no_show', 'disputed', 'refunded', 'expired')),
	CONSTRAINT "actor_valid" CHECK("booking_events"."actor" IN ('guest', 'chef', 'system', 'admin'))
);
--> statement-breakpoint
CREATE INDEX `booking_events_booking_idx` ON `booking_events` (`booking_id`);--> statement-breakpoint
CREATE TABLE `booking_items` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`course` text,
	`dish_name` text NOT NULL,
	`extra_paise` integer DEFAULT 0 NOT NULL,
	`is_addon` integer DEFAULT false NOT NULL,
	`per_guest` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `booking_items_booking_idx` ON `booking_items` (`booking_id`);--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`guest_id` text NOT NULL,
	`chef_id` text NOT NULL,
	`menu_id` text,
	`proposal_id` text,
	`address_id` text NOT NULL,
	`date` text NOT NULL,
	`slot` text NOT NULL,
	`guests` integer NOT NULL,
	`food_rule` text NOT NULL,
	`groceries_by` text NOT NULL,
	`state` text NOT NULL,
	`sub_status` text,
	`eta_minutes` integer,
	`price_snapshot` text NOT NULL,
	`menu_total_paise` integer NOT NULL,
	`convenience_fee_paise` integer NOT NULL,
	`fee_gst_paise` integer NOT NULL,
	`promo_code` text,
	`promo_paise` integer DEFAULT 0 NOT NULL,
	`wallet_paise` integer DEFAULT 0 NOT NULL,
	`total_paise` integer NOT NULL,
	`platform_fee_paise` integer NOT NULL,
	`chef_share_paise` integer NOT NULL,
	`allergies_ack_at` integer,
	`accepted_at` integer,
	`started_at` integer,
	`done_at` integer,
	`completed_at` integer,
	`paid_out_at` integer,
	`cancelled_by` text,
	`cancel_reason` text,
	`rescheduled_from` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`guest_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chef_id`) REFERENCES `chefs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`menu_id`) REFERENCES `set_menus`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`address_id`) REFERENCES `addresses`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "slot_valid" CHECK("bookings"."slot" IN ('lunch', 'dinner', 'late')),
	CONSTRAINT "food_rule_valid" CHECK("bookings"."food_rule" IN ('regular', 'jain', 'no_onion_garlic')),
	CONSTRAINT "groceries_by_valid" CHECK("bookings"."groceries_by" IN ('chef', 'guest')),
	CONSTRAINT "state_valid" CHECK("bookings"."state" IN ('payment_pending', 'requested', 'confirmed', 'in_progress', 'completed', 'paid_out', 'declined', 'cancelled', 'no_show', 'disputed', 'refunded', 'expired')),
	CONSTRAINT "sub_status_valid" CHECK("bookings"."sub_status" IN ('on_the_way', 'awaiting_finish', 'possible_no_show')),
	CONSTRAINT "cancelled_by_valid" CHECK("bookings"."cancelled_by" IN ('guest', 'chef', 'system', 'admin')),
	CONSTRAINT "guests_positive" CHECK("bookings"."guests" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_code_unique` ON `bookings` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `one_booking_per_slot` ON `bookings` (`chef_id`,`date`,`slot`) WHERE state IN ('requested', 'confirmed', 'in_progress');--> statement-breakpoint
CREATE INDEX `bookings_guest_idx` ON `bookings` (`guest_id`);--> statement-breakpoint
CREATE INDEX `bookings_chef_date_idx` ON `bookings` (`chef_id`,`date`);--> statement-breakpoint
CREATE TABLE `job_checks` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`kind` text NOT NULL,
	`lat` real,
	`lng` real,
	`distance_m` integer,
	`at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "kind_valid" CHECK("job_checks"."kind" IN ('arrival', 'door_wait', 'call'))
);
--> statement-breakpoint
CREATE INDEX `job_checks_booking_idx` ON `job_checks` (`booking_id`);--> statement-breakpoint
CREATE TABLE `job_otps` (
	`booking_id` text NOT NULL,
	`kind` text NOT NULL,
	`code_hash` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`valid_from` integer NOT NULL,
	`valid_to` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`booking_id`, `kind`),
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "kind_valid" CHECK("job_otps"."kind" IN ('start', 'finish'))
);
--> statement-breakpoint
CREATE TABLE `kitchen_checks` (
	`booking_id` text PRIMARY KEY NOT NULL,
	`gas` integer NOT NULL,
	`oven` integer NOT NULL,
	`mixer` integer NOT NULL,
	`fridge` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `availability` (
	`chef_id` text NOT NULL,
	`date` text NOT NULL,
	`slot` text NOT NULL,
	`state` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`chef_id`, `date`, `slot`),
	FOREIGN KEY (`chef_id`) REFERENCES `chefs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "slot_valid" CHECK("availability"."slot" IN ('lunch', 'dinner', 'late')),
	CONSTRAINT "state_valid" CHECK("availability"."state" IN ('open', 'off'))
);
--> statement-breakpoint
CREATE TABLE `bank_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`chef_id` text NOT NULL,
	`holder_name` text NOT NULL,
	`ifsc` text NOT NULL,
	`account_last4` text NOT NULL,
	`account_enc` text NOT NULL,
	`razorpay_linked_account_id` text,
	`penny_drop_status` text DEFAULT 'pending' NOT NULL,
	`payouts_paused_until` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`chef_id`) REFERENCES `chefs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "penny_drop_status_valid" CHECK("bank_accounts"."penny_drop_status" IN ('pending', 'verified', 'failed'))
);
--> statement-breakpoint
CREATE INDEX `bank_accounts_chef_idx` ON `bank_accounts` (`chef_id`);--> statement-breakpoint
CREATE TABLE `chef_cuisines` (
	`chef_id` text NOT NULL,
	`cuisine` text NOT NULL,
	`level` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`chef_id`, `cuisine`),
	FOREIGN KEY (`chef_id`) REFERENCES `chefs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "level_valid" CHECK("chef_cuisines"."level" IN ('good', 'great', 'expert'))
);
--> statement-breakpoint
CREATE TABLE `chef_food_rules` (
	`chef_id` text NOT NULL,
	`rule` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`chef_id`, `rule`),
	FOREIGN KEY (`chef_id`) REFERENCES `chefs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "rule_valid" CHECK("chef_food_rules"."rule" IN ('jain', 'no_onion_garlic', 'vegan', 'eggless', 'kids'))
);
--> statement-breakpoint
CREATE TABLE `chef_occasions` (
	`chef_id` text NOT NULL,
	`occasion` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`chef_id`, `occasion`),
	FOREIGN KEY (`chef_id`) REFERENCES `chefs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chef_proofs` (
	`id` text PRIMARY KEY NOT NULL,
	`chef_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`detail` text,
	`file_key` text,
	`status` text DEFAULT 'need' NOT NULL,
	`reviewed_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`chef_id`) REFERENCES `chefs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "kind_valid" CHECK("chef_proofs"."kind" IN ('kitchen', 'training', 'certificate')),
	CONSTRAINT "status_valid" CHECK("chef_proofs"."status" IN ('need', 'review', 'ok', 'rejected'))
);
--> statement-breakpoint
CREATE INDEX `chef_proofs_chef_idx` ON `chef_proofs` (`chef_id`);--> statement-breakpoint
CREATE TABLE `chefs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`slug` text NOT NULL,
	`display_name` text NOT NULL,
	`headline` text,
	`bio` text,
	`years_cooking` integer,
	`base_lat` real,
	`base_lng` real,
	`service_radius_km` integer,
	`max_guests` integer,
	`has_helper` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`paused_until` integer,
	`rating_avg` real,
	`rating_count` integer DEFAULT 0 NOT NULL,
	`jobs_done` integer DEFAULT 0 NOT NULL,
	`accept_rate` real,
	`reply_minutes_p50` integer,
	`strikes` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "status_valid" CHECK("chefs"."status" IN ('draft', 'in_review', 'live', 'paused', 'suspended'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chefs_user_id_unique` ON `chefs` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `chefs_slug_unique` ON `chefs` (`slug`);--> statement-breakpoint
CREATE INDEX `chefs_status_idx` ON `chefs` (`status`);--> statement-breakpoint
CREATE TABLE `cooking_days` (
	`chef_id` text NOT NULL,
	`weekday` integer NOT NULL,
	`slots` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`chef_id`, `weekday`),
	FOREIGN KEY (`chef_id`) REFERENCES `chefs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "weekday_range" CHECK("cooking_days"."weekday" BETWEEN 0 AND 6)
);
--> statement-breakpoint
CREATE TABLE `helpers` (
	`id` text PRIMARY KEY NOT NULL,
	`chef_id` text NOT NULL,
	`name` text NOT NULL,
	`phone_e164` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`chef_id`) REFERENCES `chefs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "status_valid" CHECK("helpers"."status" IN ('pending', 'verified', 'rejected'))
);
--> statement-breakpoint
CREATE INDEX `helpers_chef_idx` ON `helpers` (`chef_id`);--> statement-breakpoint
CREATE TABLE `kyc_checks` (
	`id` text PRIMARY KEY NOT NULL,
	`chef_id` text,
	`helper_id` text,
	`kind` text NOT NULL,
	`provider` text NOT NULL,
	`provider_ref` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`aadhaar_last4` text,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`chef_id`) REFERENCES `chefs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`helper_id`) REFERENCES `helpers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "kind_valid" CHECK("kyc_checks"."kind" IN ('aadhaar', 'pan', 'bank', 'background', 'liveness')),
	CONSTRAINT "status_valid" CHECK("kyc_checks"."status" IN ('pending', 'passed', 'failed', 'expired')),
	CONSTRAINT "kyc_checks_subject" CHECK(("kyc_checks"."chef_id" IS NULL) <> ("kyc_checks"."helper_id" IS NULL)),
	CONSTRAINT "aadhaar_last4_len" CHECK("kyc_checks"."aadhaar_last4" IS NULL OR length("kyc_checks"."aadhaar_last4") = 4)
);
--> statement-breakpoint
CREATE INDEX `kyc_checks_chef_idx` ON `kyc_checks` (`chef_id`);--> statement-breakpoint
CREATE TABLE `call_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`exotel_ref` text,
	`from_side` text NOT NULL,
	`started_at` integer,
	`duration_s` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "from_side_valid" CHECK("call_sessions"."from_side" IN ('guest', 'chef'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `call_sessions_exotel_ref_unique` ON `call_sessions` (`exotel_ref`);--> statement-breakpoint
CREATE INDEX `call_sessions_booking_idx` ON `call_sessions` (`booking_id`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`sender_id` text,
	`kind` text NOT NULL,
	`body` text,
	`menu_card` text,
	`flags` text DEFAULT '{}' NOT NULL,
	`read_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "kind_valid" CHECK("messages"."kind" IN ('text', 'photo', 'menu_card', 'system'))
);
--> statement-breakpoint
CREATE INDEX `messages_thread_idx` ON `messages` (`thread_id`);--> statement-breakpoint
CREATE TABLE `notification_prefs` (
	`user_id` text PRIMARY KEY NOT NULL,
	`marketing_opt_in` integer DEFAULT false NOT NULL,
	`quiet_hours` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`event` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`deep_link` text,
	`channel` text NOT NULL,
	`sent_at` integer,
	`read_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "channel_valid" CHECK("notifications"."channel" IN ('push', 'sms', 'email', 'in_app'))
);
--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`booking_id` text NOT NULL,
	`reporter_id` text NOT NULL,
	`category` text NOT NULL,
	`details` text,
	`photo_keys` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`outcome` text,
	`resolved_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "category_valid" CHECK("reports"."category" IN ('food', 'hygiene', 'damage', 'cash_request', 'safety', 'other')),
	CONSTRAINT "status_valid" CHECK("reports"."status" IN ('open', 'investigating', 'resolved')),
	CONSTRAINT "outcome_valid" CHECK("reports"."outcome" IN ('none', 'partial_refund', 'full_refund'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reports_code_unique` ON `reports` (`code`);--> statement-breakpoint
CREATE INDEX `reports_booking_idx` ON `reports` (`booking_id`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`author_side` text NOT NULL,
	`stars` integer NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`text` text,
	`is_private` integer DEFAULT false NOT NULL,
	`do_not_match` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "author_side_valid" CHECK("reviews"."author_side" IN ('guest', 'chef')),
	CONSTRAINT "stars_range" CHECK("reviews"."stars" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE INDEX `reviews_booking_idx` ON `reviews` (`booking_id`);--> statement-breakpoint
CREATE TABLE `sos_events` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`user_id` text NOT NULL,
	`lat` real,
	`lng` real,
	`at` integer NOT NULL,
	`handled_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sos_events_booking_idx` ON `sos_events` (`booking_id`);--> statement-breakpoint
CREATE TABLE `threads` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text,
	`request_id` text,
	`guest_id` text NOT NULL,
	`chef_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`request_id`) REFERENCES `menu_requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`guest_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chef_id`) REFERENCES `chefs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "threads_subject" CHECK("threads"."booking_id" IS NOT NULL OR "threads"."request_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE INDEX `threads_booking_idx` ON `threads` (`booking_id`);--> statement-breakpoint
CREATE TABLE `menu_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`guest_id` text NOT NULL,
	`occasion` text NOT NULL,
	`guests` integer,
	`visits_per_week` integer,
	`date` text NOT NULL,
	`slot` text NOT NULL,
	`cuisines` text DEFAULT '[]' NOT NULL,
	`food_rule` text DEFAULT 'regular' NOT NULL,
	`budget_tier` text NOT NULL,
	`must_haves` text,
	`groceries` text DEFAULT 'chef' NOT NULL,
	`address_id` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`reply_deadline_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`guest_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`address_id`) REFERENCES `addresses`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "slot_valid" CHECK("menu_requests"."slot" IN ('lunch', 'dinner', 'late')),
	CONSTRAINT "food_rule_valid" CHECK("menu_requests"."food_rule" IN ('regular', 'jain', 'no_onion_garlic')),
	CONSTRAINT "budget_tier_valid" CHECK("menu_requests"."budget_tier" IN ('simple', 'special', 'premium')),
	CONSTRAINT "groceries_valid" CHECK("menu_requests"."groceries" IN ('chef', 'guest')),
	CONSTRAINT "status_valid" CHECK("menu_requests"."status" IN ('open', 'closed', 'booked', 'expired'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `menu_requests_code_unique` ON `menu_requests` (`code`);--> statement-breakpoint
CREATE INDEX `menu_requests_guest_idx` ON `menu_requests` (`guest_id`);--> statement-breakpoint
CREATE TABLE `proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`chef_id` text NOT NULL,
	`menu` text NOT NULL,
	`price_per_guest_paise` integer NOT NULL,
	`brings_helper` integer DEFAULT false NOT NULL,
	`note` text,
	`held_until` integer NOT NULL,
	`status` text DEFAULT 'sent' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `menu_requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chef_id`) REFERENCES `chefs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "status_valid" CHECK("proposals"."status" IN ('sent', 'chosen', 'expired', 'withdrawn'))
);
--> statement-breakpoint
CREATE INDEX `proposals_request_idx` ON `proposals` (`request_id`);--> statement-breakpoint
CREATE TABLE `request_invites` (
	`request_id` text NOT NULL,
	`chef_id` text NOT NULL,
	`invited_at` integer NOT NULL,
	`seen_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`request_id`, `chef_id`),
	FOREIGN KEY (`request_id`) REFERENCES `menu_requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chef_id`) REFERENCES `chefs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `search_synonyms` (
	`term` text NOT NULL,
	`synonym` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`term`, `synonym`)
);
--> statement-breakpoint
CREATE TABLE `service_areas` (
	`id` text PRIMARY KEY NOT NULL,
	`city` text NOT NULL,
	`name` text NOT NULL,
	`polygon` text NOT NULL,
	`is_live` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `addresses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`label` text DEFAULT 'home' NOT NULL,
	`line1` text NOT NULL,
	`area` text NOT NULL,
	`city` text NOT NULL,
	`pincode` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`flat_enc` text,
	`gate_notes_enc` text,
	`service_area_id` text,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`service_area_id`) REFERENCES `service_areas`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "label_valid" CHECK("addresses"."label" IN ('home', 'work', 'other'))
);
--> statement-breakpoint
CREATE INDEX `addresses_user_idx` ON `addresses` (`user_id`);--> statement-breakpoint
CREATE TABLE `favourites` (
	`user_id` text NOT NULL,
	`chef_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `chef_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chef_id`) REFERENCES `chefs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `food_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`allergies` text DEFAULT '[]' NOT NULL,
	`rules` text DEFAULT '{}' NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `wallet_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`amount_paise` integer NOT NULL,
	`reason` text NOT NULL,
	`booking_id` text,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "reason_valid" CHECK("wallet_entries"."reason" IN ('refund_credit', 'promo', 'goodwill', 'spent'))
);
--> statement-breakpoint
CREATE INDEX `wallet_entries_user_idx` ON `wallet_entries` (`user_id`);--> statement-breakpoint
CREATE TABLE `wallets` (
	`user_id` text PRIMARY KEY NOT NULL,
	`balance_paise` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `consents` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`version` text NOT NULL,
	`granted_at` integer NOT NULL,
	`withdrawn_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "kind_valid" CHECK("consents"."kind" IN ('terms', 'privacy', 'marketing'))
);
--> statement-breakpoint
CREATE INDEX `consents_user_idx` ON `consents` (`user_id`);--> statement-breakpoint
CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`platform` text NOT NULL,
	`app` text NOT NULL,
	`push_token` text,
	`last_seen_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "platform_valid" CHECK("devices"."platform" IN ('android', 'ios', 'web')),
	CONSTRAINT "app_valid" CHECK("devices"."app" IN ('guest', 'partner'))
);
--> statement-breakpoint
CREATE INDEX `devices_user_idx` ON `devices` (`user_id`);--> statement-breakpoint
CREATE TABLE `otp_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`phone_e164` text NOT NULL,
	`purpose` text NOT NULL,
	`code_hash` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "purpose_valid" CHECK("otp_codes"."purpose" IN ('login'))
);
--> statement-breakpoint
CREATE INDEX `otp_codes_phone_idx` ON `otp_codes` (`phone_e164`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`device_id` text,
	`refresh_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`rotated_from` text,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_refresh_hash_unique` ON `sessions` (`refresh_hash`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`phone_e164` text NOT NULL,
	`name` text,
	`email` text,
	`role_flags` text DEFAULT '[]' NOT NULL,
	`age_confirmed_at` integer,
	`lang` text DEFAULT 'en' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`deleted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "lang_valid" CHECK("users"."lang" IN ('en', 'gu', 'hi')),
	CONSTRAINT "status_valid" CHECK("users"."status" IN ('active', 'blocked', 'deleted'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone_e164_unique` ON `users` (`phone_e164`);--> statement-breakpoint
CREATE TABLE `dishes` (
	`id` text PRIMARY KEY NOT NULL,
	`chef_id` text NOT NULL,
	`name` text NOT NULL,
	`course` text NOT NULL,
	`food_type` text NOT NULL,
	`description` text,
	`photo_key` text,
	`is_signature` integer DEFAULT false NOT NULL,
	`review_status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`chef_id`) REFERENCES `chefs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "food_type_valid" CHECK("dishes"."food_type" IN ('veg', 'jain', 'vegan', 'egg', 'non_veg')),
	CONSTRAINT "review_status_valid" CHECK("dishes"."review_status" IN ('pending', 'approved', 'rejected')),
	CONSTRAINT "description_len" CHECK(length("dishes"."description") <= 90)
);
--> statement-breakpoint
CREATE INDEX `dishes_chef_idx` ON `dishes` (`chef_id`);--> statement-breakpoint
CREATE TABLE `meal_prep_plans` (
	`menu_id` text NOT NULL,
	`visits_per_week` integer NOT NULL,
	`price_per_visit_paise` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`menu_id`, `visits_per_week`),
	FOREIGN KEY (`menu_id`) REFERENCES `set_menus`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `menu_addons` (
	`id` text PRIMARY KEY NOT NULL,
	`menu_id` text NOT NULL,
	`name` text NOT NULL,
	`price_per_guest_paise` integer NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`menu_id`) REFERENCES `set_menus`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `menu_addons_menu_idx` ON `menu_addons` (`menu_id`);--> statement-breakpoint
CREATE TABLE `menu_bands` (
	`menu_id` text NOT NULL,
	`min_guests` integer NOT NULL,
	`max_guests` integer NOT NULL,
	`price_per_guest_paise` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`menu_id`, `min_guests`),
	FOREIGN KEY (`menu_id`) REFERENCES `set_menus`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "band_range" CHECK("menu_bands"."min_guests" >= 1 AND "menu_bands"."max_guests" >= "menu_bands"."min_guests")
);
--> statement-breakpoint
CREATE TABLE `menu_courses` (
	`id` text PRIMARY KEY NOT NULL,
	`menu_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`menu_id`) REFERENCES `set_menus`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `menu_courses_menu_idx` ON `menu_courses` (`menu_id`);--> statement-breakpoint
CREATE TABLE `menu_options` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`dish_id` text NOT NULL,
	`extra_paise` integer DEFAULT 0 NOT NULL,
	`jain_flag` text DEFAULT 'ok' NOT NULL,
	`needs_oven` integer DEFAULT false NOT NULL,
	`oven_alt_text` text,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `menu_courses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dish_id`) REFERENCES `dishes`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "jain_flag_valid" CHECK("menu_options"."jain_flag" IN ('ok', 'jain_version', 'not_jain'))
);
--> statement-breakpoint
CREATE INDEX `menu_options_course_idx` ON `menu_options` (`course_id`);--> statement-breakpoint
CREATE TABLE `set_menus` (
	`id` text PRIMARY KEY NOT NULL,
	`chef_id` text NOT NULL,
	`name` text NOT NULL,
	`summary` text,
	`min_booking_paise` integer NOT NULL,
	`grocery_saving_paise` integer DEFAULT 0 NOT NULL,
	`offers_jain` integer DEFAULT false NOT NULL,
	`offers_nog` integer DEFAULT false NOT NULL,
	`is_live` integer DEFAULT false NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`kind` text DEFAULT 'event' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`chef_id`) REFERENCES `chefs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "kind_valid" CHECK("set_menus"."kind" IN ('event', 'meal_prep'))
);
--> statement-breakpoint
CREATE INDEX `set_menus_chef_idx` ON `set_menus` (`chef_id`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`booking_id` text NOT NULL,
	`kind` text NOT NULL,
	`pdf_key` text,
	`issued_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "kind_valid" CHECK("invoices"."kind" IN ('chef_service', 'platform_commission'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_number_unique` ON `invoices` (`number`);--> statement-breakpoint
CREATE INDEX `invoices_booking_idx` ON `invoices` (`booking_id`);--> statement-breakpoint
CREATE TABLE `ledger_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`owner_id` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "kind_valid" CHECK("ledger_accounts"."kind" IN ('guest_cash', 'chef_payable', 'platform_revenue', 'gateway_fee', 'gst_payable', 'tds_payable', 'wallet_liability', 'promo_expense'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_accounts_kind_owner` ON `ledger_accounts` (`kind`,`owner_id`);--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`txn_id` text NOT NULL,
	`account_id` text NOT NULL,
	`amount_paise` integer NOT NULL,
	`booking_id` text,
	`memo` text,
	`at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `ledger_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "amount_nonzero" CHECK("ledger_entries"."amount_paise" <> 0)
);
--> statement-breakpoint
CREATE INDEX `ledger_entries_txn_idx` ON `ledger_entries` (`txn_id`);--> statement-breakpoint
CREATE INDEX `ledger_entries_booking_idx` ON `ledger_entries` (`booking_id`);--> statement-breakpoint
CREATE INDEX `ledger_entries_account_idx` ON `ledger_entries` (`account_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`razorpay_order_id` text NOT NULL,
	`razorpay_payment_id` text,
	`method` text,
	`amount_paise` integer NOT NULL,
	`status` text DEFAULT 'created' NOT NULL,
	`captured_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "status_valid" CHECK("payments"."status" IN ('created', 'authorized', 'captured', 'failed', 'refunded'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_razorpay_order_id_unique` ON `payments` (`razorpay_order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payments_razorpay_payment_id_unique` ON `payments` (`razorpay_payment_id`);--> statement-breakpoint
CREATE INDEX `payments_booking_idx` ON `payments` (`booking_id`);--> statement-breakpoint
CREATE TABLE `payouts` (
	`id` text PRIMARY KEY NOT NULL,
	`chef_id` text NOT NULL,
	`amount_paise` integer NOT NULL,
	`razorpay_payout_ref` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`failure_reason` text,
	`attempted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`chef_id`) REFERENCES `chefs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "status_valid" CHECK("payouts"."status" IN ('queued', 'sent', 'failed', 'paid'))
);
--> statement-breakpoint
CREATE INDEX `payouts_chef_idx` ON `payouts` (`chef_id`);--> statement-breakpoint
CREATE TABLE `promo_codes` (
	`code` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`amount_paise` integer,
	`percent_bps` integer,
	`max_uses` integer,
	`per_device_limit` integer,
	`valid_from` integer NOT NULL,
	`valid_to` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "kind_valid" CHECK("promo_codes"."kind" IN ('flat', 'percent')),
	CONSTRAINT "promo_value" CHECK(("promo_codes"."kind" = 'flat' AND "promo_codes"."amount_paise" > 0) OR ("promo_codes"."kind" = 'percent' AND "promo_codes"."percent_bps" BETWEEN 1 AND 10000))
);
--> statement-breakpoint
CREATE TABLE `promo_redemptions` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`user_id` text NOT NULL,
	`device_id` text,
	`booking_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`code`) REFERENCES `promo_codes`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `promo_redemptions_code_idx` ON `promo_redemptions` (`code`);--> statement-breakpoint
CREATE INDEX `promo_redemptions_device_idx` ON `promo_redemptions` (`device_id`);--> statement-breakpoint
CREATE TABLE `refunds` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`razorpay_refund_id` text,
	`amount_paise` integer NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "status_valid" CHECK("refunds"."status" IN ('pending', 'processed', 'failed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refunds_razorpay_refund_id_unique` ON `refunds` (`razorpay_refund_id`);--> statement-breakpoint
CREATE INDEX `refunds_booking_idx` ON `refunds` (`booking_id`);--> statement-breakpoint
CREATE TABLE `tax_statements` (
	`id` text PRIMARY KEY NOT NULL,
	`chef_id` text NOT NULL,
	`period` text NOT NULL,
	`kind` text NOT NULL,
	`pdf_key` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`chef_id`) REFERENCES `chefs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "kind_valid" CHECK("tax_statements"."kind" IN ('monthly', 'form16a', 'annual'))
);
--> statement-breakpoint
CREATE INDEX `tax_statements_chef_idx` ON `tax_statements` (`chef_id`);--> statement-breakpoint
CREATE TABLE `tips` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`amount_paise` integer NOT NULL,
	`payment_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tips_booking_idx` ON `tips` (`booking_id`);--> statement-breakpoint
CREATE TABLE `transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`razorpay_transfer_id` text,
	`chef_id` text NOT NULL,
	`amount_paise` integer NOT NULL,
	`on_hold` integer DEFAULT true NOT NULL,
	`released_at` integer,
	`reversed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chef_id`) REFERENCES `chefs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transfers_razorpay_transfer_id_unique` ON `transfers` (`razorpay_transfer_id`);--> statement-breakpoint
CREATE INDEX `transfers_booking_idx` ON `transfers` (`booking_id`);--> statement-breakpoint
CREATE TABLE `admin_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "role_valid" CHECK("admin_users"."role" IN ('support', 'operations', 'finance', 'admin'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_email_unique` ON `admin_users` (`email`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_id` text NOT NULL,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`before` text,
	`after` text,
	`at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entity`,`entity_id`);--> statement-breakpoint
CREATE TABLE `feature_flags` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `idempotency_keys` (
	`key` text NOT NULL,
	`user_id` text NOT NULL,
	`route` text NOT NULL,
	`request_hash` text NOT NULL,
	`status_code` integer,
	`content_type` text,
	`response` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `key`)
);
--> statement-breakpoint
CREATE INDEX `idempotency_keys_created_idx` ON `idempotency_keys` (`created_at`);--> statement-breakpoint
CREATE TABLE `outbox_events` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`payload` text NOT NULL,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `outbox_events_unpublished_idx` ON `outbox_events` (`published_at`);--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`event_id` text NOT NULL,
	`signature_ok` integer NOT NULL,
	`payload` text NOT NULL,
	`processed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "provider_valid" CHECK("webhook_events"."provider" IN ('razorpay', 'msg91', 'exotel', 'kyc'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `webhook_events_provider_event` ON `webhook_events` (`provider`,`event_id`);