/**
 * Jobs Schema
 *
 * Tracks quantum job submissions and their lifecycle.
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const jobs = sqliteTable('jobs', {
	id: text('id').primaryKey(), // task_id e.g. eq-xxxxxxxxxxxx
	user_id: text('user_id'), // nullable for anonymous submissions
	system_type: text('system_type').notNull(), // superconducting | ion_trap | neutral_atom | photonic
	shots: integer('shots').notNull().default(1000),
	qubits: integer('qubits').notNull().default(5),
	priority: integer('priority').notNull().default(0),
	status: text('status').notNull().default('queued'), // queued | compiling | compiled | running | completed | failed
	result: text('result'), // JSON stringified result
	error: text('error'),
	fidelity: real('fidelity'),
	submitted_at: integer('submitted_at', { mode: 'timestamp' }).notNull(),
	completed_at: integer('completed_at', { mode: 'timestamp' }),
	timing: text('timing'), // JSON stringified timing info
});

