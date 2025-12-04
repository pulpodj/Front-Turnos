export default function GlassCard({ className = '', children }){
return (
<div className={`glass ${className}`.trim()}>
{children}
</div>
)
}