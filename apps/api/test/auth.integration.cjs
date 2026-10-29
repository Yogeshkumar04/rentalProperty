// Run against an isolated, running API: TEST_API_URL=http://localhost:3028/api node apps/api/test/auth.integration.cjs
const assert = require('node:assert/strict');
const base = process.env.TEST_API_URL;
if (!base) throw new Error('Set TEST_API_URL to an isolated test API (this test creates and deletes records)');
const suffix = Date.now();
const sessions = {};
async function call(path, method = 'GET', body, who, expected = 200) {
  const res = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(sessions[who] ? { Cookie: sessions[who] } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await res.json();
  assert.equal(res.status, expected, `${method} ${path}: ${JSON.stringify(data)}`);
  if (res.headers.get('set-cookie')) sessions[who] = res.headers.get('set-cookie').split(';')[0];
  return data;
}
(async () => {
  await call('/properties', 'GET', null, null, 401);
  await call('/auth/login', 'POST', { username: 'admin', password: 'incorrect' }, 'admin', 401);
  await call('/auth/login', 'POST', { username: 'admin', password: 'admin123@' }, 'admin', 201);
  await call('/auth/signup', 'POST', { username: `evil${suffix}`, password: 'password123', role: 'admin' }, null, 400);
  const landlord = await call('/users', 'POST', { username: `owner${suffix}`, password: 'password123', role: 'landlord' }, 'admin', 201);
  const client = await call('/auth/signup', 'POST', { username: `client${suffix}`, password: 'password123', role: 'client' }, null, 201);
  const other = await call('/auth/signup', 'POST', { username: `other${suffix}`, password: 'password123', role: 'landlord' }, null, 201);
  for (const [key, user] of [['landlord', landlord], ['client', client], ['other', other]]) await call('/auth/login', 'POST', { username: user.username, password: 'password123' }, key, 201);
  await call('/users', 'GET', null, 'client', 403);
  await call('/users', 'POST', { username: `blocked${suffix}`, password: 'password123', role: 'client' }, 'landlord', 403);
  const listing = { title: 'Test rental', address: 'Test address', rent: 12000, bedrooms: 2 };
  await call('/properties', 'POST', listing, 'client', 403);
  const property = await call('/properties', 'POST', listing, 'landlord', 201);
  assert.equal(property.ownerId, landlord._id);
  await call(`/properties/${property._id}`, 'PATCH', { title: 'Forbidden' }, 'other', 403);
  await call(`/properties/${property._id}`, 'DELETE', null, 'client', 403);
  await call(`/properties/${property._id}`, 'PATCH', { rent: 13000 }, 'landlord');
  await call(`/properties/${property._id}`, 'PATCH', { available: false }, 'admin');
  await call('/properties', 'GET', null, 'client');
  const accounts = await call('/users', 'GET', null, 'admin');
  assert(accounts.every(user => !user.passwordHash));
  await call(`/users/${landlord._id}`, 'DELETE', null, 'admin');
  await call('/auth/me', 'GET', null, 'landlord', 401);
  await call(`/properties/${property._id}`, 'DELETE', null, 'admin');
  await call('/auth/logout', 'POST', null, 'client', 201);
  await call('/auth/me', 'GET', null, 'client', 401);
  await call(`/users/${client._id}`, 'DELETE', null, 'admin');
  await call(`/users/${other._id}`, 'DELETE', null, 'admin');
  await call('/auth/logout', 'POST', null, 'admin', 201);
  console.log('Passed: authentication, signup role validation, account management, property ownership, admin overrides, logout, and deleted-account session revocation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
