import type { Context } from '@netlify/edge-functions';

const LOGIN_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device=device-width, initial-scale=1">
<title>NPI Dashboard - Login</title>
<style>
* { margin:0; padding:0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.login-card {
  background: rgba(255,255,255,0.95);
  border-radius: 16px;
  padding: 40px 32px;
  width: 90%;
  max-width: 380px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
.login-card h1 {
  text-align: center;
  color: #1a1a2e;
  font-size: 22px;
  margin-bottom: 8px;
}
.login-card p {
  text-align: center;
  color: #666;
  font-size: 14px;
  margin-bottom: 28px;
}
.login-card label {
  display: block;
  color: #333;
  font-size: 14px;
  margin-bottom: 6px;
  font-weight: 500;
}
.login-card input {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
  margin-bottom: 18px;
  transition: border-color 0.2s;
  outline: none;
}
.login-card input:focus {
  border-color: #0f3460;
}
.login-card button {
  width: 100%;
  padding: 13px;
  background: linear-gradient(135deg, #0f3460, #1a1a2e);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s, opacity 0.2s;
}
.login-card button:hover { opacity: 0.9; }
.login-card button:active { transform: scale(0.98); }
.error-msg {
  color: #e74c3c;
  text-align: center;
  font-size: 14px;
  margin-bottom: 14px;
  display: none;
}
</style>
</head>
<body>
<div class="login-card">
  <h1>NPI Dashboard</h1>
  <p>Enter password to continue</p>
  <div class="error-msg" id="error">Incorrect password</div>
  <form id="loginForm">
    <label for="password">Password</label>
    <input type="password" id="password" name="password" autocomplete="current-password" required autofocus>
    <button type="submit">Sign In</button>
  </form>
</div>
<script>
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('password').value;
  const errEl = document.getElementById('error');
  errEl.style.display = 'none';

  try {
    const resp = await fetch('/__auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (resp.ok) {
      window.location.reload();
    } else {
      errEl.style.display = 'block';
      document.getElementById('password').value = '';
    }
  } catch (err) {
    errEl.style.display = 'block';
  }
});
</script>
</body>
</html>`;

// Simple in-memory token store (per edge function instance)
// In production, use a consistent hash approach
function makeToken(password: string): string {
  // Create a simple hash-like token (not cryptographic, but obscures the password)
  const str = `npi:${password}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return btoa(String(hash));
}

export default async (request: Request, context: Context) => {
  const password = Netlify.env.get('BASIC_PASSWORD');

  // If no password configured, allow all access
  if (!password) {
    return await context.next();
  }

  const url = new URL(request.url);

  // Handle login API endpoint
  if (url.pathname === '/__auth' && request.method === 'POST') {
    try {
      const body = await request.json() as { password: string };
      if (body.password === password) {
        const token = makeToken(password);
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': `npi_auth=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`,
          },
        });
      }
    } catch {}
    return new Response(JSON.stringify({ success: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check if user is already authenticated via cookie
  const cookie = request.headers.get('cookie') || '';
  const authCookieMatch = cookie.match(/npi_auth=([^;]+)/);
  if (authCookieMatch) {
    try {
      const token = atob(authCookieMatch[1]);
      const expectedToken = makeToken(password);
      if (authCookieMatch[1] === expectedToken) {
        return await context.next();
      }
    } catch {}
  }

  // Not authenticated - show login page
  return new Response(LOGIN_PAGE, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};

export const config = {
  path: '/*',
};
