"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { GenerateKitResponse } from "@/lib/sponza/types";

type BootstrapState = {
  loading: boolean;
  error: string;
};

export default function ResultsClient() {
  const router = useRouter();
  const params = useSearchParams();
  const submittedUrl = params.get("url")?.trim() || "";
  const email = params.get("email")?.trim().toLowerCase() || "";
  const nicheNotes = params.get("niche")?.trim() || "";
  const [state, setState] = useState<BootstrapState>({ loading: true, error: "" });

  useEffect(() => {
    if (!submittedUrl) {
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      try {
        const response = await fetch("/api/generate-kit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: submittedUrl,
            email: email || undefined,
            niche_notes: nicheNotes || undefined,
          }),
        });

        const payload = (await response.json()) as GenerateKitResponse & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Failed to analyze this channel");
        }

        if (!cancelled) {
          router.replace(`/results/${payload.kit_id}`);
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            loading: false,
            error: error instanceof Error ? error.message : "Failed to analyze this channel",
          });
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [email, nicheNotes, router, submittedUrl]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at top, rgba(245,166,35,0.14), transparent 28%), linear-gradient(180deg, #0B1422 0%, #0F1B2D 34%, #111D2F 100%)",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "min(560px, 100%)",
          borderRadius: 28,
          padding: "32px 30px",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
        }}
      >
        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", letterSpacing: "0.08em", marginBottom: 12 }}>
          PREPARING RESULTS
        </p>
        <h1 className="font-display" style={{ fontSize: 40, lineHeight: 1.04, marginBottom: 14 }}>
          {submittedUrl && state.loading ? "Building your sponsorship report..." : "Results unavailable"}
        </h1>
        <p style={{ fontSize: 16, color: "var(--text-muted)", lineHeight: 1.7 }}>
          {submittedUrl
            ? state.loading
            ? "Sponza is analyzing your creator profile and assigning the result to a persistent kit ID."
            : state.error
            : "Missing creator URL. Start a new analysis from the homepage."}
        </p>
      </div>
    </main>
  );
}
