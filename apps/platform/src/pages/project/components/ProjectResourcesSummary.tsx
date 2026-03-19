import { Typography } from "antd";
import type { ProjectResourceSummaryItem } from "../types/projectResources.types";

interface ProjectResourcesSummaryProps {
  items: ProjectResourceSummaryItem[];
}

export const ProjectResourcesSummary = ({
  items,
}: ProjectResourcesSummaryProps) => {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:min-w-155 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-card border border-slate-200 bg-slate-50/70 px-4 py-4"
        >
          <Typography.Text className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
            {item.label}
          </Typography.Text>
          <Typography.Title level={4} className="mb-0! mt-2 text-slate-800!">
            {item.value}
          </Typography.Title>
          <Typography.Paragraph className="mb-0! mt-2 text-xs! leading-5! text-slate-500!">
            {item.hint}
          </Typography.Paragraph>
        </div>
      ))}
    </div>
  );
};
