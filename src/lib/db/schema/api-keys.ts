/**
 * API Keys Schema
 *
 * Manages API keys for programmatic access to EdgeQuanta.
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const apiKeys = sqliteTable('api_keys', {
	key: text('key').primaryKey(), // eq-xxxxxxxxxxxxxxxx
	user_id: text('user_id'),
	name: text('name').notNull().default('Unnamed Key'),
	tier: text('tier').notNull().default('standard'), // standard | premium | enterprise
	quota: integer('quota').notNull().default(1000),
	used: integer('used').notNull().default(0),
	is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
	created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
	last_used_at: integer('last_used_at', { mode: 'timestamp' }),
});

