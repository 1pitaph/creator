export const SectionHeading = ({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) => (
  <div>
    <p className="type-section-eyebrow text-zinc-400">{eyebrow}</p>
    <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="type-section-title text-zinc-950">{title}</h2>
        <p className="type-body-sm-tight mt-1 text-zinc-500">{description}</p>
      </div>
    </div>
  </div>
);
