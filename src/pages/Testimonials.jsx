import Section from '../components/Section'


export default function Testimonials() {
return (
<Section title="Testimonials">
<div className="space-y-4">
{[1,2].map(i => (
<blockquote key={i} className="card p-6">
<p className="italic text-neutral-300">“Amazing food. Cozy vibes.”</p>
<footer className="mt-2 text-sm text-neutral-400">— Customer {i}</footer>
</blockquote>
))}
</div>
</Section>
)
}