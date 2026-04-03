interface SkillMarkdownPreviewProps {
  markdown: string;
}

export const SkillMarkdownPreview = ({ markdown }: SkillMarkdownPreviewProps) => {
  return (
    <div className="mx-auto h-full max-w-[880px] px-8 py-8">
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-shell border border-slate-200/80 bg-white shadow-card">
        <div className="border-b border-slate-100 px-6 py-4">
          <p className="mb-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            SKILL.md
          </p>
        </div>
        <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap px-6 py-5 text-label leading-6 text-slate-600">
          {markdown}
        </pre>
      </section>
    </div>
  );
};
