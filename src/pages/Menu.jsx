const sampleMenu = [
{ id: 1, name: 'Chili Chicken', price: 240, tag: 'Signature' },
{ id: 2, name: 'Chili Pork', price: 280, tag: 'Spicy' },
{ id: 3, name: 'Creamy Mushroom Risotto', price: 320, tag: 'Continental' },
{ id: 4, name: 'Bacon‑Wrapped Chicken', price: 360, tag: 'Chef Special' },
]


export default function Menu() {
return (
<section className="container-section py-12">
<h2 className="text-2xl font-semibold mb-6">Menu</h2>
<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
{sampleMenu.map(item => (
<div key={item.id} className="card p-5">
<div className="flex items-start justify-between gap-4">
<h3 className="font-semibold leading-tight">{item.name}</h3>
<span className="text-sm bg-neutral-800 border border-neutral-700 rounded-full px-2 py-0.5">{item.tag}</span>
</div>
<div className="mt-4 text-brand-red text-lg font-semibold">₹ {item.price}</div>
<button className="btn btn-primary mt-4 w-max">Add to Order</button>
</div>
))}
</div>
</section>
)
}