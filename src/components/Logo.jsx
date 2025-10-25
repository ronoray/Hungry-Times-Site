export default function Logo({ className = '' }) {
return (
<div className={`flex items-center gap-2 ${className}`}>
<div className="w-8 h-8 rounded-full bg-brand-red" />
<span className="font-semibold tracking-wide">Hungry Times</span>
</div>
)
}