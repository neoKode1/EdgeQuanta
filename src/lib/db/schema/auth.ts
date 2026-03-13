/**
 * Auth Schema — Magic Links & Sessions
 *
 * Passwordless authentication using Resend magic links.
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const magicLinks = sqliteTable('magic_links', {
	id: text('id').primaryKey(), // uuid
	email: text('email').notNull(),
	token: text('token').notNull().unique(),
	expires_at: integer('expires_at', { mode: 'timestamp' }).notNull(),
	used: integer('used', { mode: 'boolean' }).notNull().default(false),
	created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(), // uuid
	user_id: text('user_id').notNull(),
	token: text('token').notNull().unique(),
	expires_at: integer('expires_at', { mode: 'timestamp' }).notNull(),
	created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
});

