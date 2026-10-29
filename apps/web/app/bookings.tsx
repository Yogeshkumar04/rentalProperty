'use client';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { request } from './api';
import { Icon } from './landing';
type Booking = { _id: string; clientUsername: string; propertyTitle: string; propertyAddress: string; propertyDeleted: boolean; rent: number; bedrooms: number; fromDate: string; toDate: string; status: 'pending' | 'approved' | 'rejected'; reviewedBy?: string; createdAt: string };
function today() { return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); }
function formatDate(value: string) { return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
export function BookingForm({ propertyId, onSubmitted }: { propertyId: string; onSubmitted: () => void }) {
  const [open, setOpen] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setSuccess('');
    if (fromDate < today() || toDate <= fromDate) { setError('Choose a check-in date today or later and a checkout date after check-in.'); return; }
    setBusy(true);
    try {
      await request('/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ propertyId, fromDate, toDate }) });
      setSuccess('Request sent. The admin or property landlord can approve it.'); setOpen(false); setFromDate(''); setToDate(''); onSubmitted();
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to send booking request'); } finally { setBusy(false); }
  }
  return <div className="booking-action">
    {!open && <button className="primary book-button" onClick={() => { setOpen(true); setSuccess(''); }}><Icon name="calendar" size={17}/> Request booking</button>}
    {success && <p className="booking-success" role="status">{success}</p>}
    {open && <form className="booking-form" onSubmit={submit}><div className="booking-dates"><label htmlFor={`from-${propertyId}`}>Check-in<input id={`from-${propertyId}`} required type="date" min={today()} value={fromDate} onChange={event => setFromDate(event.target.value)}/></label><label htmlFor={`to-${propertyId}`}>Checkout<input id={`to-${propertyId}`} required type="date" min={fromDate || today()} value={toDate} onChange={event => setToDate(event.target.value)}/></label></div><p>Checkout is exclusive. Your request is confirmed only after approval.</p>{error && <p className="booking-error" role="alert">{error}</p>}<div className="booking-form-actions"><button className="primary" disabled={busy}>{busy ? 'Sending…' : 'Send booking request'}</button><button type="button" disabled={busy} onClick={() => setOpen(false)}>Cancel</button></div></form>}
  </div>;
}
export function BookingsPanel({ role, revision }: { role: 'admin' | 'landlord' | 'client'; revision: number }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const busyRef = useRef(false);
  busyRef.current = busy;
  const load = useCallback(async () => { const data = await request('/bookings'); setBookings(data); setError(''); }, []);
  useEffect(() => {
    let active = true;
    async function refresh() {
      try { const data = await request('/bookings'); if (active) setBookings(data); }
      catch (error) { if (active) setError(error instanceof Error ? error.message : 'Unable to load requests'); }
      finally { if (active) setLoading(false); }
    }
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible' && !busyRef.current) void refresh(); }, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [revision]);
  async function decide(booking: Booking, status: 'approved' | 'rejected') {
    setBusy(true); setError(''); setNotice('');
    try { await request(`/bookings/${booking._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); await load(); setNotice(`Booking request ${status}.`); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to review request'); }
    finally { setBusy(false); }
  }
  return <section className="bookings-panel" aria-labelledby="bookings-heading"><div className="section-title"><div><p className="eyebrow">{role === 'client' ? 'YOUR NEXT CHAPTER' : 'INCOMING REQUESTS'}</p><h2 id="bookings-heading">{role === 'client' ? 'My booking requests' : 'Booking requests'} <span className="booking-count">{bookings.filter(booking => booking.status === 'pending').length} pending</span></h2></div><button className="refresh-bookings" disabled={busy} onClick={() => { void load().catch(error => setError(error instanceof Error ? error.message : 'Unable to refresh requests')); }}>Refresh</button></div>
    <p className="booking-panel-note">{role === 'client' ? 'Track your dates and approval status here.' : role === 'admin' ? 'Review requests for all properties. Either you or the property landlord can approve a request.' : 'Review requests for your properties. Either you or the admin can approve a request.'} Requests refresh every 15 seconds.</p>
    {error && <p className="booking-error" role="alert">{error}</p>}{notice && <p className="booking-success" role="status">{notice}</p>}
    {loading ? <p role="status">Loading booking requests…</p> : bookings.length === 0 ? <div className="bookings-empty"><Icon name="calendar" size={24}/><p>{role === 'client' ? 'Choose dates on an available property to send your first request.' : 'New booking requests will appear here.'}</p></div> : <div className="booking-list">{bookings.map(booking => <article className="booking-card" key={booking._id}><div className="booking-card-header"><div><h3>{booking.propertyTitle}</h3><p>{booking.propertyAddress}{booking.propertyDeleted ? ' · Listing removed' : ''}</p></div><span className={`booking-status ${booking.status}`}>{booking.status}</span></div><div className="booking-metadata"><span><Icon name="calendar" size={16}/>{formatDate(booking.fromDate)} → {formatDate(booking.toDate)}</span><span><Icon name="user" size={16}/>{booking.clientUsername}</span><span>₹{booking.rent.toLocaleString('en-IN')} / month · {booking.bedrooms === 0 ? 'Studio' : `${booking.bedrooms} bed`}</span></div><div className="booking-review"><span>{booking.reviewedBy ? `${booking.status === 'approved' ? 'Approved' : 'Rejected'} by ${booking.reviewedBy}` : `Requested ${new Date(booking.createdAt).toLocaleDateString('en-IN')}`}</span>{role !== 'client' && booking.status === 'pending' && <div><button className="primary" disabled={busy || booking.propertyDeleted} onClick={() => void decide(booking, 'approved')}>Approve request</button><button className="delete" disabled={busy} onClick={() => void decide(booking, 'rejected')}>Reject</button></div>}</div></article>)}</div>}
  </section>;
}
