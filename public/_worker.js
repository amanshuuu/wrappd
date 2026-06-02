const ADMIN_PASSWORD = 'admin123';
const COOKIE_NAME = 'admin_auth';
const COOKIE_VALUE = 'true';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (!pathname.startsWith('/admin') && pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    if (!pathname.startsWith('/admin')) {
      return serveAsset(request, env);
    }

    const cookies = request.headers.get('Cookie') || '';
    if (cookies.includes(`${COOKIE_NAME}=${COOKIE_VALUE}`)) {
      return serveAsset(request, env);
    }

    if (pathname === '/admin/login' && request.method === 'POST') {
      const formData = await request.formData();
      const password = formData.get('password');
      if (password === ADMIN_PASSWORD) {
        const response = Response.redirect(`${url.origin}/admin/dashboard`, 302);
        response.headers.set('Set-Cookie', `${COOKIE_NAME}=${COOKIE_VALUE}; Path=/; SameSite=Strict; Max-Age=86400`);
        return response;
      }
      return new Response(LOGIN_PAGE.replace('{{error}}', 'Incorrect password'), {
        headers: { 'Content-Type': 'text/html;charset=utf-8' },
      });
    }

    return new Response(LOGIN_PAGE.replace('{{error}}', ''), {
      headers: { 'Content-Type': 'text/html;charset=utf-8' },
    });
  },
};

async function serveAsset(request, env) {
  const response = await env.ASSETS.fetch(request);
  if (response.status === 404) {
    const url = new URL(request.url);
    const spaReq = new Request(`${url.origin}/index.html`, request);
    return env.ASSETS.fetch(spaReq);
  }
  return response;
}

const LOGIN_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Wrappd Gift Admin</title>

  <h1>Wrappd Gift</h1>
<h2>Admin Login</h2>
<form method="POST" action="/admin/login">
<input type="password" name="password" placeholder="Admin password" autofocus required>
<p class="error">{{error}}</p>
<button type="submit">Login</button>
</form>
</div>
</body>
</html>`;
