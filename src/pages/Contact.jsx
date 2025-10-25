import { BRAND } from '../lib/constants'


export default function Contact() {
return (
<section className="container-section py-12">
<h2 className="text-2xl font-semibold mb-6">Contact Us</h2>
<div className="grid md:grid-cols-2 gap-8">
<form className="card p-6 grid gap-4">
<input placeholder="Name" className="bg-neutral-900 border-neutral-700 rounded-md" />
<input type="email" placeholder="Email" className="bg-neutral-900 border-neutral-700 rounded-md" />
<textarea rows="5" placeholder="Message" className="bg-neutral-900 border-neutral-700 rounded-md" />
<button className="btn btn-primary w-max" type="button">Send</button>
</form>
<div className="card p-6 text-neutral-300">
<p>{BRAND.address}</p>
<p className="mt-2">Phone: {BRAND.phone1}, {BRAND.phone2}</p>
<p className="mt-2">Email: {BRAND.email}</p>
<p className="mt-4 text-sm text-neutral-400">Map & hours to be added.</p>
</div>
</div>
</section>
)
}