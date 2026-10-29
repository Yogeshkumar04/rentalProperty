const assert = require('node:assert/strict');
const base = process.env.TEST_API_URL;
if (!base) throw new Error('Set TEST_API_URL to an isolated test API');
const suffix = Date.now();
const sessions = {};
async function call(path, method = 'GET', body, who, expected = 200) {
  const response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(sessions[who] ? { Cookie: sessions[who] } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (expected !== null) assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(data)}`);
  if (response.headers.get('set-cookie')) sessions[who] = response.headers.get('set-cookie').split(';')[0];
  return expected === null ? { status: response.status, data } : data;
}
const date = days => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
(async () => {
  await call('/bookings', 'GET', null, null, 401);
  await call('/auth/login', 'POST', { username: 'admin', password: 'admin123@' }, 'admin', 201);
  const users = {};
  for (const [name, role] of [['owner', 'landlord'], ['other', 'landlord'], ['client', 'client'], ['second', 'client']]) {
    users[name] = await call('/auth/signup', 'POST', { username: `${name}${suffix}`, password: 'password123', role }, null, 201);
    await call('/auth/login', 'POST', { username: users[name].username, password: 'password123' }, name, 201);
  }
  const property = await call('/properties', 'POST', { title: 'Booking test', address: 'Test city', rent: 12500, bedrooms: 2 }, 'owner', 201);
  const dto = { propertyId: property._id, fromDate: date(10), toDate: date(15) };
  await call('/bookings', 'POST', dto, 'owner', 403);
  await call('/bookings', 'POST', { ...dto, fromDate: date(-1) }, 'client', 400);
  await call('/bookings', 'POST', { ...dto, toDate: dto.fromDate }, 'client', 400);
  await call('/bookings', 'POST', { ...dto, fromDate: '2028-02-30', toDate: '2028-03-10' }, 'client', 400);
  const first = await call('/bookings', 'POST', dto, 'client', 201);
  await call('/bookings', 'POST', dto, 'client', 409);
  const second = await call('/bookings', 'POST', dto, 'second', 201);
  assert.equal((await call('/bookings', 'GET', null, 'owner')).length, 2);
  assert.equal((await call('/bookings', 'GET', null, 'other')).length, 0);
  assert.equal((await call('/bookings', 'GET', null, 'client')).length, 1);
  const visibleToAdmin = await call('/bookings', 'GET', null, 'admin');
  assert(visibleToAdmin.some(item => item._id === first._id && item.clientUsername === users.client.username && item.propertyTitle === property.title));
  const propertyView = await call(`/properties/${property._id}`, 'GET', null, 'second');
  assert.equal(propertyView.bookingRequests, undefined);
  await call(`/bookings/${first._id}`, 'PATCH', { status: 'approved' }, 'client', 403);
  await call(`/bookings/${first._id}`, 'PATCH', { status: 'approved' }, 'other', 404);
  await call(`/bookings/${first._id}`, 'PATCH', { status: 'pending' }, 'admin', 400);
  const outcomes = await Promise.all([
    call(`/bookings/${first._id}`, 'PATCH', { status: 'approved' }, 'owner', null),
    call(`/bookings/${second._id}`, 'PATCH', { status: 'approved' }, 'admin', null),
  ]);
  assert.deepEqual(outcomes.map(item => item.status).sort(), [200, 409]);
  const loser = outcomes[0].status === 409 ? first : second;
  await call(`/bookings/${loser._id}`, 'PATCH', { status: 'rejected' }, 'owner');
  const winner = outcomes[0].status === 200 ? first : second;
  await call(`/bookings/${winner._id}`, 'PATCH', { status: 'rejected' }, 'admin', 409);
  await call('/bookings', 'POST', dto, 'client', 409);
  const adjacent = await call('/bookings', 'POST', { ...dto, fromDate: date(15), toDate: date(20) }, 'client', 201);
  const approval = await call(`/bookings/${adjacent._id}`, 'PATCH', { status: 'approved' }, 'admin');
  assert.equal(approval.reviewedBy, 'admin');
  const pending = await call('/bookings', 'POST', { ...dto, fromDate: date(25), toDate: date(30) }, 'client', 201);
  await call(`/properties/${property._id}`, 'PATCH', { available: false }, 'owner');
  await call(`/bookings/${pending._id}`, 'PATCH', { status: 'approved' }, 'owner', 409);
  await call('/bookings', 'POST', { ...dto, fromDate: date(35), toDate: date(40) }, 'client', 409);
  await call(`/properties/${property._id}`, 'DELETE', null, 'admin');
  await call(`/properties/${property._id}`, 'GET', null, 'client', 404);
  const history = await call('/bookings', 'GET', null, 'client');
  assert(history.some(item => item._id === pending._id && item.propertyDeleted));
  await call(`/bookings/${pending._id}`, 'PATCH', { status: 'approved' }, 'admin', 409);
  await call(`/bookings/${pending._id}`, 'PATCH', { status: 'rejected' }, 'admin');
  for (const user of Object.values(users)) await call(`/users/${user._id}`, 'DELETE', null, 'admin');
  await call('/auth/logout', 'POST', null, 'admin', 201);
  console.log('Passed: booking dates, role isolation, request details, duplicate prevention, concurrent overlapping approvals, admin/owner review, adjacent dates, unavailable listings, and archived history.');
})().catch(error => { console.error(error); process.exitCode = 1; });
