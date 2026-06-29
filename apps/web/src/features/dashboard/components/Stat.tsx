export const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg bg-white px-2 py-2 shadow-[0_1px_1px_rgba(24,24,27,0.02)]">
    <p className="type-meta-2xs-regular text-zinc-500">{label}</p>
    <p className="type-card-title-base mt-1 text-zinc-900">{value}</p>
  </div>
);
