import { Link } from 'react-router-dom'
import { ORDER_LINKS } from '../lib/constants'
import hero1200 from '../assets/hero-1200.jpg';


export default function Hero() {
return (
<section className="container-section py-16 md:py-24">
<div className="grid md:grid-cols-2 gap-10 items-center">
<div>
<h1 className="text-4xl md:text-5xl font-bold leading-tight">Chinese‑Continental Fusion. <span className="text-brand-red">Fresh</span>. Cozy. Kolkata.</h1>
<p className="mt-4 text-neutral-300">Signature dishes like Chili Pork, Chili Chicken, creamy Risottos, and bacon‑wrapped specials. Dine‑in, takeaway, or order online.</p>
<div className="mt-6 flex flex-wrap gap-3">
<Link to="/order" className="btn btn-primary">Order on Website</Link>
<a href={ORDER_LINKS.swiggy} target="_blank" rel="noreferrer" className="btn btn-ghost">Swiggy</a>
<a href={ORDER_LINKS.zomato} target="_blank" rel="noreferrer" className="btn btn-ghost">Zomato</a>
</div>
</div>
<div className="card h-64 md:h-80 overflow-hidden">
  <img
    src={hero1200}
    alt="Hungry Times interior"
    className="w-full h-full object-cover object-center md:object-right"
    width="1200" height="800"
    loading="eager"
  />
</div>
</div>
</section>
)
}