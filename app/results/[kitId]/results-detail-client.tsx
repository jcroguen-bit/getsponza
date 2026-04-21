"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { GenerateKitResponse } from "@/lib/sponza/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FetchState = {
  loading: boolean;
  error: string;
  data: GenerateKitResponse | null;
};

function formatNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-US").format(value);
}

function formatCurrency(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "TBD";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function ScoreGauge({ score }: { score: number }) {
  const radius = 82;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div style={{ position: "relative", width: 220, height: 220 }}>
      <svg width="220" height="220" viewBox="0 0 220 220" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="110" cy="110" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
        <circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F5A623" />
            <stop offset="100%" stopColor="#FFD277" />
          </linearGradient>
        </defs>
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span className="font-display" style={{ fontSize: 54, fontWeight: 900, lineHeight: 1 }}>
          {score}
        </span>
        <span style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Readiness Score</span>
      </div>
    </div>
  );
}

function LockedOverlay({ ctaLabel, onUnlock, pending }: { ctaLabel: string; onUnlock: () => void; pending: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 16,
        display: "grid",
        placeItems: "center",
        borderRadius: 22,
        background: "linear-gradient(180deg, rgba(9,14,24,0.25), rgba(9,14,24,0.92))",
        border: "1px solid rgba(245,166,35,0.24)",
      }}
    >
      <div style={{ width: "min(360px, 100%)", textAlign: "center", padding: "18px" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", letterSpacing: "0.08em", marginBottom: 10 }}>
          FULL KIT LOCKED
        </p>
        <p style={{ color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 16 }}>
          Unlock the sponsor-ready pack to remove the blur and download the PDF, pitch emails, and full brand list.
        </p>
        <button
          onClick={onUnlock}
          disabled={pending}
          style={{
            border: "none",
            borderRadius: 999,
            background: "var(--gold)",
            color: "var(--navy)",
            fontWeight: 800,
            padding: "13px 18px",
            cursor: pending ? "wait" : "pointer",
          }}
        >
          {pending ? "Redirecting..." : ctaLabel}
        </button>
      </div>
    </div>
  );
}

export default function ResultsDetailClient({
  kitId,
  returnedFromCheckout,
}: {
  kitId: number;
  returnedFromCheckout: boolean;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FetchState>({ loading: true, error: "", data: null });
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [downloadPending, setDownloadPending] = useState(false);
  const [refreshPending, setRefreshPending] = useState(false);
  const [manualReloadTick, setManualReloadTick] = useState(0);

  const fetchKit = async (silent = false) => {
    if (!silent) {
      setState((current) => ({ ...current, loading: true, error: "" }));
    }

    try {
      const response = await fetch(`/api/kits/${kitId}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as GenerateKitResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load this kit");
      }

      setState({ loading: false, error: "", data: payload });
      setEmail((current) => current || payload.email || "");
    } catch (error) {
      setState((current) => ({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load this kit",
        data: current.data,
      }));
    }
  };

  useEffect(() => {
    void fetchKit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kitId, manualReloadTick]);

  useEffect(() => {
    if (state.data?.access_tier === "paid") {
      return;
    }

    if (!returnedFromCheckout && !state.data?.email) {
      return;
    }

    const interval = window.setInterval(() => {
      void fetchKit(true);
    }, returnedFromCheckout ? 4000 : 12000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnedFromCheckout, state.data?.access_tier, state.data?.email, kitId]);

  const handleCheckout = async (targetKitId = kitId) => {
    const checkoutEmail = email.trim().toLowerCase();

    if (!checkoutEmail || !EMAIL_PATTERN.test(checkoutEmail)) {
      setState((current) => ({
        ...current,
        error: "Enter a valid email before checkout so GetSponza can send your unlock confirmation.",
      }));
      return;
    }

    setCheckoutPending(true);

    try {
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kit_id: targetKitId,
          email: checkoutEmail,
        }),
      });
      const payload = (await response.json()) as { error?: string; url?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Failed to create checkout session");
      }

      window.location.assign(payload.url);
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Failed to create checkout session",
      }));
      setCheckoutPending(false);
    }
  };

  const handleDownloadPack = async () => {
    setDownloadPending(true);

    try {
      const response = await fetch("/api/download-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kit_id: kitId }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to generate sponsorship pack");
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = "getsponza-sponsorship-pack.zip";
      anchor.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Failed to generate sponsorship pack",
      }));
    } finally {
      setDownloadPending(false);
    }
  };

  const handleRefreshPurchase = async () => {
    setRefreshPending(true);

    try {
      const response = await fetch("/api/refresh-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kit_id: kitId }),
      });
      const payload = (await response.json()) as GenerateKitResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to create refresh kit");
      }

      await handleCheckout(payload.kit_id);
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Failed to create refresh kit",
      }));
    } finally {
      setRefreshPending(false);
    }
  };

  const kit = state.data;
  const creator = kit?.creator_profile;
  const isPaid = kit?.access_tier === "paid";
  const checkoutLabel = `Get Your Full Kit — ${formatCurrency(kit?.purchase_price_cents)}`;

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(245,166,35,0.14), transparent 28%), linear-gradient(180deg, #0B1422 0%, #0F1B2D 34%, #111D2F 100%)",
      }}
    >
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          backdropFilter: "blur(14px)",
          background: "rgba(10,18,30,0.78)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            maxWidth: 1160,
            margin: "0 auto",
            padding: "0 24px",
            height: 66,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <Link href="/" className="font-display" style={{ fontSize: 22, fontWeight: 800, color: "var(--gold)", textDecoration: "none" }}>
            GetSponza
          </Link>
          {isPaid ? (
            <button
              onClick={handleDownloadPack}
              disabled={downloadPending}
              style={{
                background: "var(--gold)",
                color: "var(--navy)",
                border: "none",
                borderRadius: 999,
                padding: "11px 20px",
                fontWeight: 700,
                fontSize: 14,
                cursor: downloadPending ? "wait" : "pointer",
              }}
            >
              {downloadPending ? "Preparing Pack..." : "Download Your Sponsorship Pack"}
            </button>
          ) : (
            <button
              onClick={() => void handleCheckout()}
              disabled={checkoutPending}
              style={{
                background: "var(--gold)",
                color: "var(--navy)",
                borderRadius: 999,
                border: "none",
                padding: "11px 20px",
                fontWeight: 700,
                fontSize: 14,
                cursor: checkoutPending ? "wait" : "pointer",
              }}
            >
              {checkoutPending ? "Redirecting..." : checkoutLabel}
            </button>
          )}
        </div>
      </nav>

      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "42px 24px 88px" }}>
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 24,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 28,
              padding: "32px 32px 28px",
              boxShadow: "0 30px 80px rgba(0,0,0,0.22)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 999,
                marginBottom: 18,
                background: "rgba(245,166,35,0.12)",
                border: "1px solid rgba(245,166,35,0.24)",
                color: "var(--gold)",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
              }}
            >
              {isPaid ? "FULL KIT UNLOCKED" : returnedFromCheckout ? "CONFIRMING PAYMENT" : "FREE READINESS SCORE"}
            </div>

            <h1
              className="font-display"
              style={{
                fontSize: "clamp(34px, 5vw, 56px)",
                lineHeight: 1.04,
                letterSpacing: "-0.03em",
                marginBottom: 14,
              }}
            >
              {creator ? `${creator.name} sponsorship report` : "Your sponsorship report"}
            </h1>

            <p style={{ maxWidth: 620, fontSize: 16, lineHeight: 1.7, color: "var(--text-muted)", marginBottom: 24 }}>
              GetSponza analyzed this creator profile, surfaced the free readiness score, and can unlock the full sponsor-ready pack after checkout.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 26 }}>
              {[creator?.platform, creator?.niche, kit ? `Kit #${kit.kit_id}` : null, kit ? `Analyzed ${formatDate(kit.last_analyzed)}` : null]
                .filter(Boolean)
                .map((item) => (
                  <span
                    key={item}
                    style={{
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.05)",
                      color: "var(--warm-white)",
                      padding: "8px 12px",
                      fontSize: 12,
                    }}
                  >
                    {item}
                  </span>
                ))}
            </div>

            {state.error ? (
              <div
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(255,138,138,0.35)",
                  background: "rgba(120,24,24,0.35)",
                  color: "#FFD4D4",
                  padding: "14px 16px",
                  marginBottom: 18,
                }}
              >
                {state.error}
              </div>
            ) : null}

            {returnedFromCheckout && !isPaid ? (
              <div
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(245,166,35,0.24)",
                  background: "rgba(245,166,35,0.08)",
                  color: "var(--warm-white)",
                  padding: "16px 18px",
                  marginBottom: 18,
                }}
              >
                Payment received. GetSponza is waiting for Stripe&apos;s webhook confirmation before unlocking the full kit on this page.
              </div>
            ) : null}

            {!isPaid ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 12,
                  alignItems: "center",
                  padding: "16px 18px",
                  borderRadius: 18,
                  border: "1px solid rgba(245,166,35,0.24)",
                  background: "rgba(245,166,35,0.08)",
                }}
              >
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", letterSpacing: "0.08em", marginBottom: 6 }}>
                    CHECKOUT EMAIL
                  </p>
                  <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
                    Use the same email at checkout so GetSponza can send the unlock confirmation for this exact kit.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value.trim().toLowerCase())}
                    placeholder="you@example.com"
                    style={{
                      width: 240,
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(10,14,22,0.42)",
                      color: "var(--warm-white)",
                      padding: "12px 14px",
                      fontSize: 14,
                    }}
                  />
                  <button
                    onClick={() => void handleCheckout()}
                    disabled={checkoutPending}
                    style={{
                      border: "none",
                      borderRadius: 12,
                      background: "var(--gold)",
                      color: "var(--navy)",
                      fontWeight: 700,
                      padding: "12px 16px",
                      cursor: checkoutPending ? "wait" : "pointer",
                    }}
                  >
                    {checkoutPending ? "Redirecting..." : checkoutLabel}
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                  padding: "14px 18px",
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div>
                  <p style={{ fontSize: 12, color: "var(--gold)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>
                    FULL KIT READY
                  </p>
                  <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
                    Download the sponsorship pack ZIP from this page at any time.
                  </p>
                </div>
                <button
                  onClick={() => setManualReloadTick((current) => current + 1)}
                  style={{
                    alignSelf: "center",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "transparent",
                    color: "var(--warm-white)",
                    padding: "10px 16px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Refresh Kit Status
                </button>
              </div>
            )}
          </div>

          <div
            style={{
              background: "linear-gradient(180deg, rgba(245,166,35,0.12), rgba(255,255,255,0.04))",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 28,
              padding: "28px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              minHeight: 360,
            }}
          >
            {state.loading || !kit ? (
              <div style={{ width: "100%", color: "var(--text-muted)" }}>
                <div style={{ height: 220, borderRadius: 22, background: "rgba(255,255,255,0.05)", marginBottom: 18 }} />
                Building your sponsorship profile...
              </div>
            ) : (
              <>
                <ScoreGauge score={kit.readiness_score} />
                <div style={{ textAlign: "center" }}>
                  <p className="font-display" style={{ fontSize: 24, marginBottom: 6 }}>
                    {kit.readiness_label}
                  </p>
                  <p style={{ color: "var(--text-muted)", lineHeight: 1.6, fontSize: 14 }}>
                    {isPaid
                      ? "Your sponsorship pack is unlocked. Download the ZIP to get the PDF media kit, pitch emails, and brand list."
                      : "The free score is visible now. The full sponsor-ready kit unlocks immediately after the Stripe payment settles."}
                  </p>
                </div>
                <div
                  style={{
                    width: "100%",
                    borderRadius: 18,
                    padding: "14px 16px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", letterSpacing: "0.08em", marginBottom: 8 }}>
                    PACK STATUS
                  </p>
                  <p style={{ fontSize: 14, color: "var(--warm-white)", marginBottom: 6 }}>
                    {isPaid
                      ? kit.pack_ready_at
                        ? "Ready for download"
                        : "PDF is generated on demand"
                      : returnedFromCheckout
                        ? "Waiting for Stripe webhook confirmation"
                        : "Free tier only until payment completes"}
                  </p>
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    Includes `media_kit.pdf`, `pitch_emails.txt`, and `brand_list.csv`.
                  </p>
                </div>
              </>
            )}
          </div>
        </section>

        {state.loading || !kit || !creator ? null : (
          <>
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 24,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 24,
                  padding: "26px 28px",
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", letterSpacing: "0.08em", marginBottom: 12 }}>
                  CHANNEL SNAPSHOT
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 12,
                    marginBottom: 22,
                  }}
                >
                  {[
                    ["Followers", formatNumber(creator.followers)],
                    ["Avg views", formatNumber(creator.avg_views)],
                    ["Engagement", creator.engagement_rate],
                    ["Posting frequency", creator.posting_frequency],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        borderRadius: 18,
                        padding: "16px 18px",
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.03)",
                      }}
                    >
                      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>{label}</p>
                      <p className="font-display" style={{ fontSize: 28, lineHeight: 1.05 }}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {kit.readiness_insights.map((insight) => (
                    <div
                      key={insight}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 18,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "var(--text-muted)",
                        lineHeight: 1.6,
                      }}
                    >
                      {insight}
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 24,
                  padding: "26px 28px",
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", letterSpacing: "0.08em", marginBottom: 12 }}>
                  AUDIENCE FIT
                </p>
                <div style={{ display: "grid", gap: 12, marginBottom: 18 }}>
                  {[
                    ["Age range", creator.audience_age],
                    ["Gender split", creator.audience_gender],
                    ["Geographic focus", isPaid ? "Included in PDF media kit" : "Unlocked after payment"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 16,
                        paddingBottom: 12,
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>{label}</span>
                      <span style={{ color: "var(--warm-white)", fontWeight: 700, textAlign: "right" }}>{value}</span>
                    </div>
                  ))}
                </div>
                <p style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>{kit.media_kit_summary}</p>
              </div>
            </section>

            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 24,
              }}
            >
              <div
                style={{
                  position: "relative",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 24,
                  padding: "26px 28px",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-end", marginBottom: 18 }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", letterSpacing: "0.08em", marginBottom: 8 }}>
                      BRAND MATCHES
                    </p>
                    <h2 className="font-display" style={{ fontSize: 30, lineHeight: 1.05 }}>
                      {isPaid ? `${kit.brand_matches.length} sponsor targets` : `${kit.brand_matches.length} unlocked previews`}
                    </h2>
                  </div>
                </div>
                <div style={{ display: "grid", gap: 12, filter: isPaid ? "none" : "blur(6px)" }}>
                  {kit.brand_matches.map((brand) => (
                    <div
                      key={`${brand.brand}-${brand.contact_route}`}
                      style={{
                        borderRadius: 18,
                        background: "rgba(13,21,34,0.72)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        padding: "18px 18px 16px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                        <div>
                          <p style={{ fontSize: 18, fontWeight: 800, color: "var(--warm-white)" }}>{brand.brand}</p>
                          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{brand.category} · {brand.tier}</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: 12, color: "var(--gold)", fontWeight: 700 }}>{brand.contact_route}</p>
                          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{brand.contact_detail}</p>
                        </div>
                      </div>
                      <p style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>{brand.why_match}</p>
                    </div>
                  ))}
                </div>
                {!isPaid ? <LockedOverlay ctaLabel={checkoutLabel} onUnlock={() => void handleCheckout()} pending={checkoutPending} /> : null}
              </div>

              <div style={{ display: "grid", gap: 24 }}>
                <div
                  style={{
                    position: "relative",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 24,
                    padding: "26px 28px",
                    overflow: "hidden",
                  }}
                >
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", letterSpacing: "0.08em", marginBottom: 10 }}>
                    RATE CARD
                  </p>
                  <h2 className="font-display" style={{ fontSize: 30, lineHeight: 1.05, marginBottom: 14 }}>
                    {formatCurrency(kit.rate_card.range_low)} - {formatCurrency(kit.rate_card.range_high)}
                  </h2>
                  <div style={{ filter: isPaid ? "none" : "blur(6px)" }}>
                    <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>
                      Quoted per {"per" in kit.rate_card ? kit.rate_card.per : "campaign"}
                    </p>
                    <div
                      style={{
                        borderRadius: 18,
                        overflow: "hidden",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {[
                        ["30s Integration", "breakdown" in kit.rate_card ? kit.rate_card.breakdown.integration_30s : "Unlocked after payment"],
                        ["Dedicated Video", "breakdown" in kit.rate_card ? kit.rate_card.breakdown.dedicated_video : "Unlocked after payment"],
                        ["Instagram Story", "breakdown" in kit.rate_card ? kit.rate_card.breakdown.instagram_story : "Unlocked after payment"],
                      ].map(([label, value], index) => (
                        <div
                          key={label}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            padding: "14px 16px",
                            background: index % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)",
                          }}
                        >
                          <span style={{ color: "var(--warm-white)", fontWeight: 700 }}>{label}</span>
                          <span style={{ color: "var(--text-muted)" }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {!isPaid ? <LockedOverlay ctaLabel={checkoutLabel} onUnlock={() => void handleCheckout()} pending={checkoutPending} /> : null}
                </div>

                <div
                  style={{
                    position: "relative",
                    background: "linear-gradient(180deg, rgba(15,27,45,0.8), rgba(245,166,35,0.08))",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 24,
                    padding: "26px 28px",
                    overflow: "hidden",
                  }}
                >
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", letterSpacing: "0.08em", marginBottom: 10 }}>
                    OUTREACH PACK
                  </p>
                  <h2 className="font-display" style={{ fontSize: 30, lineHeight: 1.05, marginBottom: 12 }}>
                    {isPaid ? "Sponsor-ready ZIP deliverable" : "Paid deliverables"}
                  </h2>
                  <p style={{ color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 18 }}>
                    {isPaid
                      ? "Download a single ZIP that includes your designed PDF media kit, all pitch emails, and the complete sponsor contact list."
                      : "Upgrade to unlock the professionally designed PDF media kit, the full outreach pack, and the sponsor contact CSV."}
                  </p>
                  <div style={{ filter: isPaid ? "none" : "blur(6px)" }}>
                    <div
                      style={{
                        borderRadius: 18,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        padding: "16px 18px",
                        marginBottom: 18,
                      }}
                    >
                      <p style={{ fontSize: 12, color: "var(--gold)", fontWeight: 700, marginBottom: 8 }}>FIRST PITCH EMAIL</p>
                      <p style={{ fontSize: 14, color: "var(--warm-white)", fontWeight: 700, marginBottom: 8 }}>
                        {kit.pitch_emails[0]?.subject || "Subject line generated after analysis"}
                      </p>
                      <p style={{ color: "var(--text-muted)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                        {kit.pitch_emails[0]?.body || "Your custom outreach copy will appear here."}
                      </p>
                    </div>
                  </div>
                  {isPaid ? (
                    <button
                      onClick={handleDownloadPack}
                      disabled={downloadPending}
                      style={{
                        width: "100%",
                        border: "none",
                        borderRadius: 16,
                        padding: "15px 18px",
                        background: "var(--gold)",
                        color: "var(--navy)",
                        fontWeight: 800,
                        fontSize: 15,
                        cursor: downloadPending ? "wait" : "pointer",
                      }}
                    >
                      {downloadPending ? "Preparing Pack..." : "Download Your Sponsorship Pack"}
                    </button>
                  ) : (
                    <>
                      <LockedOverlay ctaLabel={checkoutLabel} onUnlock={() => void handleCheckout()} pending={checkoutPending} />
                      <div style={{ height: 52 }} />
                    </>
                  )}
                </div>

                {isPaid ? (
                  <div
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 24,
                      padding: "26px 28px",
                    }}
                  >
                    <p style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", letterSpacing: "0.08em", marginBottom: 10 }}>
                      KIT REFRESH
                    </p>
                    <h2 className="font-display" style={{ fontSize: 30, lineHeight: 1.05, marginBottom: 12 }}>
                      Refresh available in 90 days — $19
                    </h2>
                    <p style={{ color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 18 }}>
                      Refresh creates a brand-new kit record with the same creator URL and email, then sends it through the $19 checkout flow.
                    </p>
                    <div
                      style={{
                        borderRadius: 18,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        padding: "16px 18px",
                        marginBottom: 18,
                        color: "var(--text-muted)",
                      }}
                    >
                      {kit.refresh_eligible
                        ? "Refresh is unlocked for this kit now."
                        : `Refresh unlocks on ${formatDate(kit.refresh_available_at)}.`}
                    </div>
                    <button
                      onClick={handleRefreshPurchase}
                      disabled={!kit.refresh_eligible || refreshPending || checkoutPending}
                      style={{
                        width: "100%",
                        border: "none",
                        borderRadius: 16,
                        padding: "15px 18px",
                        background: kit.refresh_eligible ? "var(--gold)" : "rgba(255,255,255,0.08)",
                        color: kit.refresh_eligible ? "var(--navy)" : "var(--text-muted)",
                        fontWeight: 800,
                        fontSize: 15,
                        cursor: kit.refresh_eligible && !refreshPending ? "pointer" : "not-allowed",
                      }}
                    >
                      {refreshPending ? "Preparing Refresh..." : "Start Refresh Checkout — $19"}
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
