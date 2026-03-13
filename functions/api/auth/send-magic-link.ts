/**
 * POST /api/auth/send-magic-link
 *
 * Sends a magic link email via Resend. Creates user if not exists.
 */
import { Resend } from 'resend';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { magicLinks } from '../../../src/lib/db/schema/auth';
import { users } from '../../../src/lib/db/schema/users';
import type { Env } from '../../types';
import { json, errorResponse } from '../../types';

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const { email } = (await context.request.json()) as { email?: string };

	if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return errorResponse('Valid email required', 400);
	}

	const db = drizzle(context.env.DB);
	const resend = new Resend(context.env.RESEND_API_KEY);

	// Upsert user
	const existing = await db.select().from(users).where(eq(users.email, email)).get();
	if (!existing) {
		const now = new Date();
		await db.insert(users).values({
			id: crypto.randomUUID(),
			email,
			name: email.split('@')[0],
			tier: 'free',
			quota_remaining: 100,
			created_at: now,
			updated_at: now,
		});
	}

	// Generate token
	const token = crypto.randomUUID();
	const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

	await db.insert(magicLinks).values({
		id: crypto.randomUUID(),
		email,
		token,
		expires_at: expires,
		used: false,
		created_at: new Date(),
	});

	// Build verify URL
	const origin = new URL(context.request.url).origin;
	const verifyUrl = `${origin}/api/auth/verify?token=${token}`;

	// Send email via Resend
	const { error } = await resend.emails.send({
		from: 'EdgeQuanta <auth@edgequanta.28neo.com>',
		to: [email],
		subject: 'Sign in to EdgeQuanta',
		html: `
			<div style="font-family: monospace; background: #0a0a0a; color: #00ffcc; padding: 40px; max-width: 480px;">
				<h2 style="color: #fff; letter-spacing: 2px;">EDGE QUANTA</h2>
				<p>Click below to sign in:</p>
				<a href="${verifyUrl}" style="display: inline-block; padding: 12px 32px; background: #00ffcc; color: #000; text-decoration: none; font-weight: bold; letter-spacing: 1px; margin: 16px 0;">
					SIGN IN →
				</a>
				<p style="font-size: 12px; opacity: 0.6;">This link expires in 15 minutes.</p>
			</div>
		`,
	});

	if (error) {
		console.error('Resend error:', error);
		return errorResponse('Failed to send email', 500);
	}

	return json({ ok: true, message: 'Magic link sent' });
};

