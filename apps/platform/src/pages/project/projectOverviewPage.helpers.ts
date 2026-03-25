export const resolveProjectOverviewSummaryItems = <TItem>({
  loading,
  error,
  items,
}: {
  loading: boolean;
  error: string | null;
  items: TItem[];
}): TItem[] | undefined => {
  if (error) return undefined;

  // During initial load / project switches, list hooks may clear to [] while loading.
  // Treat that as unavailable to avoid rendering "zero activity/resources" judgments.
  if (loading && items.length === 0) return undefined;

  return items;
};

