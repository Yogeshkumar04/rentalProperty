'use client';
import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';

export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/><path d="M9 8h6"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    arrow: <><path d="M4 12h16m-6-6 6 6-6 6"/></>,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/></>,
    key: <><circle cx="8" cy="8" r="5"/><path d="m12 12 9 9m-5-5 3-3m-6 0 3-3"/></>,
    check: <><path d="m7 12 3 3 7-7"/><path d="M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6Z"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/></>,
    building: <><path d="M4 21V3h12v18M16 9h4v12M2 21h20M8 7h4M8 11h4M8 15h4M9 21v-3h2v3"/></>,
    leaf: <><path d="M20 3C9 1 2 7 5 15s17 5 15-12ZM4 21 16 8"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2"/></>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    globe: <><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.home}</svg>;
}
export function Brand() { return <a className="brand" href="/" aria-label="Rental Property home"><span className="brand-symbol"><Icon name="home" size={28}/></span><span>rental<span className="brand-light">property</span><span className="brand-dot">.</span></span></a>; }
const destinations = [
  { name: 'Bengaluru', subtitle: 'City living, with room to breathe', image: 'apartment', category: 'City living' },
  { name: 'Goa', subtitle: 'A little closer to the coast', image: 'goa', category: 'Coastal escapes' },
  { name: 'Mumbai', subtitle: 'Find your place in the city', image: 'city', category: 'City living' },
  { name: 'Pune', subtitle: 'Slower mornings. Greener spaces.', image: 'cottage', category: 'Quiet corners' },
];
export default function Landing({ onAuth, onSearch, children, authOpen, onClose }: { onAuth: (signup: boolean, role?: string) => void; onSearch: (query: string, bedrooms: string) => void; children: ReactNode; authOpen: boolean; onClose: () => void }) {
  const [category, setCategory] = useState('All homes');
  const [query, setQuery] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const modal = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!authOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const elements = modal.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, a[href]');
      if (!elements?.length) return;
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [authOpen, onClose]);
  function search(event: FormEvent) { event.preventDefault(); onSearch(query.trim(), bedrooms); }
  return <div className="landing">
    <a className="skip-link" href="#explore">Skip to content</a>
    <div className="landing-nav"><Brand/><nav aria-label="Main navigation"><a className="nav-active" href="#explore">Find a home</a><a href="#how-it-works">How it works</a></nav><div className="nav-account"><button className="host-link" onClick={() => onAuth(true, 'landlord')}>List your property <Icon name="arrow" size={16}/></button><button className="login-button" onClick={() => onAuth(false)}><Icon name="user" size={16}/> Log in</button></div></div>
    <main className="landing-main">
      <section className="landing-hero" aria-labelledby="hero-heading">
        <div className="hero-copy"><span className="hero-kicker"><span/> A NEW PLACE. A NEW CHAPTER.</span><h1 id="hero-heading">Somewhere<br/>you&apos;ll love<br/>to <span>call home.</span></h1><p>For fresh starts, familiar comforts, and everything<br className="desktop-break"/> in between. Find a rental that feels like you.</p><a className="hero-link" href="#explore">Find your kind of home <span><Icon name="arrow" size={19}/></span></a><div className="hero-footnote"><Icon name="key" size={18}/><span>Your next chapter starts with the right space.</span></div></div>
        <div className="hero-visual"><img src="/images/living-room.jpg" alt="Bright, thoughtfully furnished living room with warm natural textures" fetchPriority="high"/><span className="photo-caption"><span className="caption-dot"/> Room to make yourself at home</span><div className="hero-image-label"><Icon name="home" size={18}/><span>More than a place.<br/><b>A feeling of belonging.</b></span></div></div>
      </section>
      <form className="home-search" onSubmit={search}><label><span>Where</span><div><Icon name="pin" size={18}/><input aria-label="Search city or neighbourhood" placeholder="City or neighbourhood" value={query} onChange={e => setQuery(e.target.value)}/></div></label><label><span>Your space</span><select aria-label="Number of bedrooms" value={bedrooms} onChange={e => setBedrooms(e.target.value)}><option value="">Any number of bedrooms</option><option value="0">Studio</option><option value="1">1 bedroom</option><option value="2">2 bedrooms</option><option value="3">3+ bedrooms</option></select></label><div className="search-note"><Icon name="key" size={20}/><span>A place for<br/><b>your everyday</b></span></div><button className="search-button" type="submit"><Icon name="search" size={20}/> Explore homes</button></form>
      <section id="explore" className="explore-section"><div className="explore-heading"><div><span className="section-kicker">A LITTLE INSPIRATION</span><h2>Find a place that feels like you.</h2><p>City energy or a quieter corner. Where will you feel at home?</p></div><span className="inspiration-note">Places to inspire your search</span></div>
        <div className="category-row" aria-label="Explore by lifestyle">{[{ label: 'All homes', icon: 'home' }, { label: 'City living', icon: 'building' }, { label: 'Coastal escapes', icon: 'sun' }, { label: 'Quiet corners', icon: 'leaf' }].map(item => <button key={item.label} aria-pressed={category === item.label} className={category === item.label ? 'category selected' : 'category'} onClick={() => setCategory(item.label)}><Icon name={item.icon} size={19}/>{item.label}</button>)}</div>
        <div className="destination-grid">{destinations.filter(place => category === 'All homes' || place.category === category).map(place => <button className="destination-card" key={place.name} onClick={() => onSearch(place.name, '')}><div className="destination-image"><img loading="lazy" src={`/images/${place.image}.jpg`} alt={`${place.category} inspiration for your next home`}/><span>{place.category}</span><div className="destination-arrow"><Icon name="arrow" size={18}/></div></div><div className="destination-title"><h3>{place.name}</h3><Icon name="pin" size={16}/></div><p>{place.subtitle}</p></button>)}</div>
        <p className="photo-disclaimer">Illustrative photography. Log in to explore current rental listings.</p>
      </section>
      <section className="how-section" id="how-it-works"><div><span className="section-kicker">LESS SEARCHING. MORE LIVING.</span><h2>Your next move,<br/>made simpler.</h2><p>One place to find a home.<br/>One place to manage it.</p></div><div className="how-step"><span>01</span><Icon name="search" size={26}/><h3>Find your fit</h3><p>Explore listings by location and space to find what works for your life.</p></div><div className="how-step"><span>02</span><Icon name="user" size={26}/><h3>Make yourself at home</h3><p>Create a client account and keep exploring the homes available to rent.</p></div><div className="how-step"><span>03</span><Icon name="key" size={26}/><h3>Have a space to share?</h3><p>Join as a landlord to add your properties and manage their availability.</p></div></section>
      <section className="host-banner"><div><span className="section-kicker">FOR THE PLACE YOU OWN</span><h2>A great home deserves<br/>to be found.</h2><p>Bring your property to its next chapter.<br/>Add your listing and manage it all in one place.</p><button className="dark-button" onClick={() => onAuth(true, 'landlord')}>Start listing your property <Icon name="arrow" size={18}/></button></div><img loading="lazy" src="/images/apartment.jpg" alt="A welcoming contemporary home interior"/></section>
    </main>
    <footer className="landing-footer"><div><Brand/><p>Good spaces. Fresh starts.</p></div><div className="footer-links"><a href="#explore">Explore homes</a><button onClick={() => onAuth(true, 'landlord')}>Become a landlord</button><a href="#how-it-works">How it works</a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Rental Property</span><span><Icon name="globe" size={15}/> English (IN) <b>₹ INR</b></span></div></footer>
    {authOpen && <div className="modal-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}><div ref={modal} className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title"><div className="dialog-top"><span>Welcome to Rental Property</span><button ref={closeButton} aria-label="Close login dialog" onClick={onClose}><Icon name="close"/></button></div>{children}</div></div>}
  </div>;
}
