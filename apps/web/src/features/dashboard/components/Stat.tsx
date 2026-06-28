export const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg bg-white px-2 py-2 shadow-[0_1px_1px_rgba(24,24,27,0.02)]">
    <p className="text-[11px] text-zinc-500">{label}</p>
    <p className="mt-1 font-semibold text-zinc-900">{value}</p>
  </div>
);
