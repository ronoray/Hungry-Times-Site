import Hero from '../components/Hero'


function Section({ title, children }) {
return (
<section className="container-section py-12">
{title && <h2 className="text-2xl font-semibold mb-6">{title}</h2>}
{children}
</section>
)
}


export default function Home() {
return (
<>
<Hero />
<Section title="Highlights">
<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
{[1,2,3].map(i => (
<div key={i} className="card p-6">
<h3 className="font-semibold mb-2">Signature Dish {i}</h3>
<p className="text-neutral-300">Teaser text. Replace with real copy & images.</p>
</div>
))}
</div>
</Section>
</>
)
}