import type { Context } from '@netlify/edge-functions';

export default async (request: Request, context: Context) => {
  // Get credentials from environment variables
  const username = Netlify.env.get('BASIC_USERNAME') || 'admin';
  const password = Netlify.env.get('BASIC_PASSWORD');

  // If no password is set, allow access without authentication
  if (!password) {
    return context.next();
  }

  // Check Authorization header
  const authHeader = request.headers.get('Authorization');
  const expectedAuth = `Basic ${btoa(`${username}:${password}`)}`;

  if (!authHeader || authHeader !== expectedAuth) {
    return new Response('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="NPI Dashboard"',
      },
    });
  }

  return context.next();
};

export const config = {
  path: '/*',
  excludedPath: '/.netlify/*',
};
