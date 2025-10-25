import Section from '../components/Section'


export default function Gallery() {
return (
<Section title="Gallery">
<div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
{[...Array(6)].map((_,i) => (
<div key={i} className="card aspect-video"/>
))}
</div>
</Section>
)
}