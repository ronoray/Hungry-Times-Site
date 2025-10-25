import Section from '../components/Section'


export default function Feedback() {
return (
<Section title="Feedback">
<p className="text-neutral-300 mb-4">We value your thoughts. Tell us what to improve!</p>
<form className="card p-6 grid gap-4 max-w-xl">
<input placeholder="Your name (optional)" className="bg-neutral-900 border-neutral-700 rounded-md" />
<textarea rows="5" placeholder="Write your feedback" className="bg-neutral-900 border-neutral-700 rounded-md" />
<button className="btn btn-primary w-max">Submit</button>
</form>
</Section>
)
}