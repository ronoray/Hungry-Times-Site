export default function Section({ title, children, className = '' }) {
return (
<section className={`container-section py-12 ${className}`}>
{title && <h2 className="text-2xl font-semibold mb-6">{title}</h2>}
{children}
</section>
)
}