/**
 * Chat History Schema
 *
 * Persists Clawbot agentic chat conversations.
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const chatSessions = sqliteTable('chat_sessions', {
	id: text('id').primaryKey(), // uuid
	user_id: text('user_id'),
	title: text('title').notNull().default('New Conversation'),
	created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
	updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const chatMessages = sqliteTable('chat_messages', {
	id: text('id').primaryKey(), // uuid
	session_id: text('session_id').notNull(),
	role: text('role').notNull(), // user | assistant | system
	content: text('content').notNull(),
	tool_calls: text('tool_calls'), // JSON stringified tool call data
	tool_results: text('tool_results'), // JSON stringified tool results
	created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
});

