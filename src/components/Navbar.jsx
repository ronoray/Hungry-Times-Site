import { Link, NavLink } from 'react-router-dom'
import { BRAND } from '../lib/constants'
import logo from '../assets/logo.svg';


const links = [
{ to: '/', label: 'Home' },
{ to: '/menu', label: 'Menu' },
{ to: '/order', label: 'Order' },
{ to: '/gallery', label: 'Gallery' },
{ to: '/testimonials', label: 'Testimonials' },
{ to: '/reservation', label: 'Reservation' },
{ to: '/contact', label: 'Contact' }
]


export default function Navbar() {
return (
<header className="sticky top-0 z-50 backdrop-blur bg-neutral-950/70 border-b border-neutral-800">
<nav className="container-section h-16 flex items-center justify-between">
<Link to="/" className="flex items-center gap-3 py-1">
<img
  src={logo}
  alt="Hungry Times"
  className="h-9 w-auto"
  width="180" height="36"
  loading="eager"
/>
<span className="sr-only">{BRAND.name}</span>
</Link>
<ul className="hidden md:flex items-center gap-6">
{links.map(l => (
<li key={l.to}>
<NavLink
to={l.to}
className={({ isActive }) => `text-sm hover:text-white ${isActive ? 'text-white' : 'text-neutral-300'}`}
>{l.label}</NavLink>
</li>
))}
</ul>
<div className="hidden sm:flex items-center gap-3">
<a href={`tel:${BRAND.phone1}`} className="text-sm text-neutral-300 hover:text-white">{BRAND.phone1}</a>
<Link to="/order" className="btn btn-primary text-sm">Order Now</Link>
</div>
</nav>
</header>
)
}