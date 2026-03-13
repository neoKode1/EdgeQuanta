CREATE TABLE `api_keys` (
	`key` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text DEFAULT 'Unnamed Key' NOT NULL,
	`tier` text DEFAULT 'standard' NOT NULL,
	`quota` integer DEFAULT 1000 NOT NULL,
	`used` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`last_used_at` integer
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`tool_calls` text,
	`tool_results` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`title` text DEFAULT 'New Conversation' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`tier` text DEFAULT 'free' NOT NULL,
	`quota_remaining` integer DEFAULT 100 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`system_type` text NOT NULL,
	`shots` integer DEFAULT 1000 NOT NULL,
	`qubits` integer DEFAULT 5 NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`result` text,
	`error` text,
	`fidelity` real,
	`submitted_at` integer NOT NULL,
	`completed_at` integer,
	`timing` text
);
