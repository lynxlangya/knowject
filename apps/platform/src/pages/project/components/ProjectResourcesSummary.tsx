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
      {items.map((item, index) => (
        <div
          key={item.label}
          className="group relative overflow-hidden rounded-panel border border-[#C2EDE6] bg-[#F2FDFB] px-4 py-4 transition-shadow duration-200 hover:shadow-[0_6px_20px_rgba(15,42,38,0.08)]"
          style={{
            animation: `metricFadeIn 360ms cubic-bezier(0.22,1,0.36,1) both`,
            animationDelay: `${index * 60}ms`,
          }}
        >
          {/* Accent top bar */}
          <span
            className="absolute inset-x-0 top-0 h-0.5 rounded-b-full opacity-60 transition-opacity duration-200 group-hover:opacity-100"
            style={{ backgroundColor: '#28B8A0' }}
            aria-hidden="true"
          />
          <Typography.Text className="text-caption mb-1 block font-semibold uppercase tracking-[0.14em] text-[#1A8A77]">
            {item.label}
          </Typography.Text>
          <Typography.Title level={4} className="mb-0! mt-2! text-slate-900!">
            {item.value}
          </Typography.Title>
          <Typography.Paragraph className="mb-0! mt-2 text-xs! leading-5! text-[#4A6260]!">
            {item.hint}
          </Typography.Paragraph>
        </div>
      ))}
    </div>
  );
};
