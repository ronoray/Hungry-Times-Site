export default function Reservation() {
return (
<section className="container-section py-12">
<h2 className="text-2xl font-semibold mb-6">Reservation</h2>
<form className="card p-6 grid gap-4 max-w-xl">
<div className="grid md:grid-cols-2 gap-4">
<input placeholder="Name" className="bg-neutral-900 border-neutral-700 rounded-md" />
<input type="tel" placeholder="Phone" className="bg-neutral-900 border-neutral-700 rounded-md" />
</div>
<div className="grid md:grid-cols-2 gap-4">
<input type="date" className="bg-neutral-900 border-neutral-700 rounded-md" />
<input type="time" className="bg-neutral-900 border-neutral-700 rounded-md" />
</div>
<input type="number" min="1" placeholder="Guests" className="bg-neutral-900 border-neutral-700 rounded-md" />
<button className="btn btn-primary w-max" type="button">Book a Table</button>
</form>
</section>
)
}