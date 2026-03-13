/**
 * GET /api/auth/session
 *
 * Returns current user info if session is valid, or 401.
 */
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { sessions } from '../../../src/lib/db/schema/auth';
import { users } from '../../../src/lib/db/schema/users';
import type { Env } from '../../types';
import { json, errorResponse } from '../../types';

function getSessionToken(request: Request): string | null {
	const cookie = request.headers.get('Cookie') || '';
	const match = cookie.match(/eq_session=([^;]+)/);
	return match ? match[1] : null;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
	const token = getSessionToken(context.request);

	if (!token) {
		return errorResponse('Not authenticated', 401);
	}

	const db = drizzle(context.env.DB);

	const session = await db.select().from(sessions).where(eq(sessions.token, token)).get();

	if (!session || new Date() > session.expires_at) {
		return errorResponse('Session expired', 401);
	}

	const user = await db.select().from(users).where(eq(users.id, session.user_id)).get();

	if (!user) {
		return errorResponse('User not found', 404);
	}

	return json({
		user: {
			id: user.id,
			email: user.email,
			name: user.name,
			tier: user.tier,
		},
	});
};

