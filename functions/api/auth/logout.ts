/**
 * POST /api/auth/logout
 *
 * Deletes session and clears cookie.
 */
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { sessions } from '../../../src/lib/db/schema/auth';
import type { Env } from '../../types';
import { json } from '../../types';

function getSessionToken(request: Request): string | null {
	const cookie = request.headers.get('Cookie') || '';
	const match = cookie.match(/eq_session=([^;]+)/);
	return match ? match[1] : null;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const token = getSessionToken(context.request);

	if (token) {
		const db = drizzle(context.env.DB);
		await db.delete(sessions).where(eq(sessions.token, token));
	}

	return json(
		{ ok: true },
		200,
		{
			'Set-Cookie': 'eq_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
		}
	);
};

