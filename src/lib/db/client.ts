/**
 * EdgeQuanta D1 Database Client
 *
 * Provides a typed Drizzle ORM client for the D1 database.
 */

import { drizzle } from 'drizzle-orm/d1';
import type { D1Database } from '@cloudflare/workers-types';
import * as schema from './schema';

/**
 * Create a Drizzle ORM client for the D1 database
 *
 * @param d1 - D1Database binding from platform.env.DB
 * @returns Drizzle ORM client with schema
 */
export function createDbClient(d1: D1Database) {
	return drizzle(d1, { schema });
}

export type DbClient = ReturnType<typeof createDbClient>;

