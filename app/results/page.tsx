import { Suspense } from "react";

import ResultsClient from "@/app/results/results-client";

export default function ResultsPage() {
  return (
    <Suspense>
      <ResultsClient />
    </Suspense>
  );
}
