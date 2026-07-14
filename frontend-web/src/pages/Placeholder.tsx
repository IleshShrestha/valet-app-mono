export default function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-maroon-900">{title}</h2>
      <p className="mt-2 text-sm text-gray-500">Coming soon.</p>
    </div>
  );
}
