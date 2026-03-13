/**
 * EdgeQuanta — API middleware (CORS + auth enforcement + error handling)
 * Applied to all /api/* routes automatically by Pages Functions.
 */
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { sessions } from '../../src/lib/db/schema/auth';
import { handleCors, errorResponse } from '../types';
import type { Env } from '../types';

/** Routes that don't require authentication */
const PUBLIC_PATHS = [
  '/api/health',
  '/api/auth/send-magic-link',
  '/api/auth/verify',
  '/api/auth/session',
  '/api/auth/logout',
];

function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/eq_session=([^;]+)/);
  return match ? match[1] : null;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  // Handle CORS preflight
  if (context.request.method === 'OPTIONS') {
    return handleCors();
  }

  // Auth enforcement — skip for public routes
  const url = new URL(context.request.url);
  const isPublic = PUBLIC_PATHS.some((p) => url.pathname === p || url.pathname.startsWith(p + '/'));

  if (!isPublic) {
    const token = getSessionToken(context.request);
    if (!token) {
      return errorResponse('Authentication required', 401);
    }

    const db = drizzle(context.env.DB);
    const session = await db.select().from(sessions).where(eq(sessions.token, token)).get();

    if (!session || new Date() > session.expires_at) {
      return errorResponse('Session expired', 401);
    }
  }

  try {
    const response = await context.next();
    // Add CORS headers to all responses
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('API error:', message);
    return errorResponse(message, 500);
  }
};

