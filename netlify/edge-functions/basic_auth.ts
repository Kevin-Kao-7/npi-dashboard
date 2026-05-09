import type { Context } from '@netlify/edge-functions';

export default async (request: Request, context: Context) => {
  // Get credentials from environment variables
  const username = Netlify.env.get('BASIC_USERNAME') || 'admin';
  const password = Netlify.env.get('BASIC_PASSWORD');

  // If no password is set, allow access without authentication
  if (!password) {
    return await context.next();
  }

  // Check Authorization header
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return new Response('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="NPI Dashboard"',
      },
    });
  }

  // Parse and verify credentials
  const encoded = authHeader.replace('Basic ', '');
  const decoded = atob(encoded);
  const [user, pass] = decoded.split(':');

  if (user !== username || pass !== password) {
    return new Response('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="NPI Dashboard"',
      },
    });
  }

  // Auth successful, continue to static file
  return await context.next();
};

export const config = {
  path: '/*',
};
