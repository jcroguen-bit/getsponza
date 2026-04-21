import { notFound } from "next/navigation";

import ResultsDetailClient from "@/app/results/[kitId]/results-detail-client";

export default async function ResultDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ kitId: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const [{ kitId }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const numericKitId = Number(kitId);

  if (!Number.isInteger(numericKitId) || numericKitId <= 0) {
    notFound();
  }

  return (
    <ResultsDetailClient
      kitId={numericKitId}
      returnedFromCheckout={resolvedSearchParams.paid === "true"}
    />
  );
}
