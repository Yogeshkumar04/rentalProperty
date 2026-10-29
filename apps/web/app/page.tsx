'use client';
import Landing, { Brand, Icon } from './landing';
import { FormEvent, useCallback, useEffect, useState } from 'react';
type Property = { _id: string; title: string; address: string; rent: number; bedrooms: number; description: string; available: boolean; ownerId?: string };
type User = { _id: string; username: string; role: 'admin' | 'landlord' | 'client' };
const empty = { title: '', address: '', rent: '', bedrooms: '1', description: '', available: true };
const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
async function request(path = '', options?: RequestInit) {
  const response = await fetch(`${api}${path}`, { ...options, credentials: 'include' });
  const data = await response.json();
  if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Request failed');
  return data;
}
export default function Home() {
  const [authOpen, setAuthOpen] = useState(false);
  const closeAuth = useCallback(() => setAuthOpen(false), []);
  const [searchQuery, setSearchQuery] = useState('');
  const [bedroomFilter, setBedroomFilter] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [signup, setSignup] = useState(false);
  const [account, setAccount] = useState({ username: '', password: '', role: 'client' });
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'landlord' });
  const [notice, setNotice] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setProperties(await request('/properties'));
      if (user?.role === 'admin') setUsers(await request('/users')); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to connect to API'); }
    finally { setLoading(false); }
  }, [user]);
  useEffect(() => { request('/auth/me').then(setUser).catch(() => {}).finally(() => setChecking(false)); }, []);
  useEffect(() => { if (user) void load(); }, [load, user]);
  async function authenticate(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      if (signup) await request('/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(account) });
      setUser(await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: account.username, password: account.password }) }));
      setAuthOpen(false);
      setAccount({ username: '', password: '', role: 'client' });
    } catch (e) { setError(e instanceof Error ? e.message : 'Authentication failed'); } finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true);
    try { await request('/auth/logout', { method: 'POST' }); setUser(null); setProperties([]); setUsers([]); setEditing(null); setForm(empty); setError(''); setNotice(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to log out'); } finally { setBusy(false); }
  }
  async function createUser(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { await request('/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser) }); setNewUser({ username: '', password: '', role: 'landlord' }); setNotice('Account created. The user can now log in.'); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to create account'); } finally { setBusy(false); }
  }
  async function deleteUser(target: User) {
    if (!window.confirm(`Delete ${target.username}'s account? Their listings will remain available for admin management.`)) return;
    setBusy(true); setError('');
    try { await request(`/users/${target._id}`, { method: 'DELETE' }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to delete account'); } finally { setBusy(false); }
  }
  const canManage = (property: Property) => user?.role === 'admin' || (user?.role === 'landlord' && property.ownerId === user._id);
  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await request(editing ? `/properties/${editing}` : '/properties', { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, title: form.title.trim(), address: form.address.trim(), rent: Number(form.rent), bedrooms: Number(form.bedrooms) }) });
      setForm(empty); setEditing(null); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save property'); }
    finally { setBusy(false); }
  }
  async function remove(property: Property) {
    if (!window.confirm(`Delete “${property.title}”?`)) return;
    setBusy(true); setError('');
    try { await request(`/properties/${property._id}`, { method: 'DELETE' }); if (editing === property._id) { setEditing(null); setForm(empty); } await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to delete property'); }
    finally { setBusy(false); }
  }
  if (checking) return <main><p role="status">Loading your session…</p></main>;
  if (!user) return <Landing authOpen={authOpen} onClose={closeAuth} onAuth={(mode, role) => { setSignup(mode); setAccount({ username: '', password: '', role: role || 'client' }); setError(''); setAuthOpen(true); }} onSearch={(query, bedrooms) => { setSearchQuery(query); setBedroomFilter(bedrooms); setSignup(false); setError(''); setAuthOpen(true); }}>
    <section className="auth-panel form-panel"><p className="eyebrow">YOUR SPACE, SIMPLIFIED</p><h1 id="auth-title">{signup ? 'Create an account' : 'Welcome back'}</h1><p>Log in to find your next home or manage your properties.</p>
      {error && <div className="error" role="alert">{error}</div>}
      <form onSubmit={authenticate}>
        <label>Username<input required minLength={3} maxLength={40} pattern="[a-zA-Z0-9_.-]+" autoComplete="username" value={account.username} onChange={e => setAccount({ ...account, username: e.target.value })}/></label>
        <label>Password<input required type="password" minLength={8} maxLength={128} autoComplete={signup ? 'new-password' : 'current-password'} value={account.password} onChange={e => setAccount({ ...account, password: e.target.value })}/></label>
        {signup && <label>Account role<select value={account.role} onChange={e => setAccount({ ...account, role: e.target.value })}><option value="client">Client — browse properties</option><option value="landlord">Landlord — manage your listings</option></select></label>}
        <button className="primary" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Sign up' : 'Log in'}</button>
        <button type="button" disabled={busy} onClick={() => { setSignup(!signup); setError(''); }}>{signup ? 'Already have an account? Log in' : 'New here? Sign up'}</button>
      </form>
    </section>
  </Landing>;
  const filteredProperties = properties.filter(p => `${p.title} ${p.address}`.toLowerCase().includes(searchQuery.toLowerCase()) && (bedroomFilter === '' || (bedroomFilter === '3' ? p.bedrooms >= 3 : p.bedrooms === Number(bedroomFilter))));
  return <main>
    <header><Brand/><div className="account-bar"><span className="tag">{user.username} · {user.role}</span><button disabled={busy} onClick={() => void logout()}>Log out</button></div></header>
    <section className="intro"><p className="eyebrow">YOUR SPACE, SIMPLIFIED</p><h1>{user.role === 'client' ? 'Find your next home.' : 'A home for your properties.'}</h1><p>{user.role === 'admin' ? 'Manage accounts, listings and availability from one place.' : user.role === 'landlord' ? 'Browse all listings and manage the properties you own.' : 'Explore rental listings and availability.'}</p></section>
    <div className="dashboard-search"><label>Search properties<input placeholder="City, neighbourhood or property name" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/></label><label>Bedrooms<select value={bedroomFilter} onChange={e => setBedroomFilter(e.target.value)}><option value="">Any bedrooms</option><option value="0">Studio</option><option value="1">1 bedroom</option><option value="2">2 bedrooms</option><option value="3">3+ bedrooms</option></select></label><button onClick={() => { setSearchQuery(''); setBedroomFilter(''); }}>Clear filters</button></div>
    <div className="stats"><div><strong>{properties.length}</strong><span>Total properties</span></div><div><strong>{properties.filter(p => p.available).length}</strong><span>Available to rent</span></div></div>
    {error && <div className="error" role="alert">{error} <button onClick={() => void load()} disabled={busy}>Retry</button></div>}
    {notice && <p role="status">{notice}</p>}
    {user.role === 'admin' && <section className="admin-panel form-panel"><div><p className="eyebrow">ADMINISTRATION</p><h2>Manage accounts</h2><p>Create landlord and client accounts. Deleting an account signs the user out; its properties remain under admin management.</p>
      {users.length === 0 ? <p>No landlord or client accounts yet.</p> : users.map(target => <div className="user-row" key={target._id}><span><b>{target.username}</b> · {target.role}</span><button className="delete" disabled={busy} onClick={() => void deleteUser(target)}>Delete account</button></div>)}
    </div><form onSubmit={createUser}><label>Username<input required minLength={3} maxLength={40} pattern="[a-zA-Z0-9_.-]+" autoComplete="off" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })}/></label><label>Password<input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })}/></label><label>Role<select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}><option value="landlord">Landlord</option><option value="client">Client</option></select></label><button className="primary" disabled={busy}>Create account</button></form></section>}
    <div className={user.role === 'client' ? 'workspace browse' : 'workspace'}><section className="list"><div className="section-title"><h2>Property listings</h2><span>{filteredProperties.length} listings</span></div>
      {loading ? <p role="status">Loading properties…</p> : filteredProperties.length === 0 ? <div className="empty"><h3>No properties found.</h3><p>{user.role === 'client' ? 'Try a different search or check back soon for listings.' : 'Try another search or add a rental property using the form.'}</p></div> : filteredProperties.map(p => <article key={p._id}>
        <div className="card-top"><span className="house">⌂</span><span className={p.available ? 'status' : 'status occupied'}>{p.available ? 'Available' : 'Occupied'}</span></div>
        <h3>{p.title}</h3><p className="address">{p.address}</p><p className="description">{p.description || 'No description added.'}</p>
        <div className="details"><span><b>₹{p.rent.toLocaleString('en-IN')}</b> / month</span><span>{p.bedrooms === 0 ? 'Studio' : `${p.bedrooms} bed`}</span></div>
        {canManage(p) && <div className="actions"><button disabled={busy} onClick={() => { setEditing(p._id); setForm({ title: p.title, address: p.address, rent: String(p.rent), bedrooms: String(p.bedrooms), description: p.description, available: p.available }); }}>Edit property</button><button className="delete" disabled={busy} onClick={() => void remove(p)}><Icon name="trash" size={16}/>Delete</button></div>}
      </article>)}
    </section>{user.role !== 'client' && <section className="form-panel"><p className="eyebrow">GROW YOUR PORTFOLIO</p><h2>{editing ? 'Edit property' : 'Add a property'}</h2><p>Just the essentials to get started.</p>
      <form onSubmit={save}>
        <label>Property name<input required maxLength={120} placeholder="e.g. Maple Grove Apartment" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}/></label>
        <label>Address<input required maxLength={250} placeholder="Street, area, city" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}/></label>
        <div className="form-row"><label>Monthly rent (₹)<input type="number" required min="1" max="100000000" step="0.01" placeholder="15000" value={form.rent} onChange={e => setForm({ ...form, rent: e.target.value })}/></label><label>Bedrooms<input type="number" required min="0" max="50" value={form.bedrooms} onChange={e => setForm({ ...form, bedrooms: e.target.value })}/></label></div>
        <label>Description<textarea rows={3} maxLength={2000} placeholder="What makes this place special?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}/></label>
        <label className="checkbox"><input type="checkbox" checked={form.available} onChange={e => setForm({ ...form, available: e.target.checked })}/> Available for rent</label>
        <button className="primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : '+ Add property'}</button>
        {editing && <button type="button" disabled={busy} onClick={() => { setEditing(null); setForm(empty); }}>Cancel editing</button>}
      </form>
    </section>}</div><footer>Rental Property · A simpler way to manage your spaces.</footer>
  </main>;
}
