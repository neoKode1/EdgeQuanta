/**
 * Users Schema
 *
 * Tracks platform users and their tier/quota information.
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: text('id').primaryKey(), // uuid
	email: text('email').notNull().unique(),
	name: text('name').notNull(),
	tier: text('tier').notNull().default('free'), // free | standard | enterprise
	quota_remaining: integer('quota_remaining').notNull().default(100),
	created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
	updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

