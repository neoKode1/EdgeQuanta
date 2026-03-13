/**
 * GET /api/auth/verify?token=xxx
 *
 * Verifies magic link token, creates session, redirects to app.
 */
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { magicLinks, sessions } from '../../../src/lib/db/schema/auth';
import { users } from '../../../src/lib/db/schema/users';
import type { Env } from '../../types';
import { errorResponse } from '../../types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
	const url = new URL(context.request.url);
	const token = url.searchParams.get('token');

	if (!token) {
		return errorResponse('Token required', 400);
	}

	const db = drizzle(context.env.DB);

	// Find magic link
	const link = await db
		.select()
		.from(magicLinks)
		.where(and(eq(magicLinks.token, token), eq(magicLinks.used, false)))
		.get();

	if (!link) {
		return errorResponse('Invalid or expired link', 401);
	}

	if (new Date() > link.expires_at) {
		return errorResponse('Link expired', 401);
	}

	// Mark as used
	await db.update(magicLinks).set({ used: true }).where(eq(magicLinks.id, link.id));

	// Find user
	const user = await db.select().from(users).where(eq(users.email, link.email)).get();
	if (!user) {
		return errorResponse('User not found', 404);
	}

	// Create session (30 day expiry)
	const sessionToken = crypto.randomUUID();
	const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

	await db.insert(sessions).values({
		id: crypto.randomUUID(),
		user_id: user.id,
		token: sessionToken,
		expires_at: sessionExpiry,
		created_at: new Date(),
	});

	// Redirect to app with session cookie
	const origin = url.origin;
	return new Response(null, {
		status: 302,
		headers: {
			Location: `${origin}/`,
			'Set-Cookie': `eq_session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`,
			'Access-Control-Allow-Origin': '*',
		},
	});
};

