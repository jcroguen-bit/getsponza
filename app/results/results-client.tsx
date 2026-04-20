"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { GenerateKitResponse } from "@/lib/sponza/types";

const PAYMENT_LINK = "https://buy.stripe.com/aFaeVe3He16v6iC2SneP03g";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function buildPaymentLink(email: string) {
  const url = new URL(PAYMENT_LINK);

  if (email) {
    url.searchParams.set("prefilled_email", email);
  }

  return url.toString();
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

type FetchState = {
  loading: boolean;
  error: string;
  data: GenerateKitResponse | null;
};

export default function ResultsClient() {
  const params = useSearchParams();
  const submittedUrl = params.get("url")?.trim() || "";
  const initialEmail = params.get("email")?.trim().toLowerCase() || "";
  const initialNicheNotes = params.get("niche")?.trim() || "";

  const [email, setEmail] = useState(initialEmail);
  const [nicheNotes] = useState(initialNicheNotes);
  const [state, setState] = useState<FetchState>({ loading: true, error: "", data: null });
  const [downloadPending, setDownloadPending] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const paymentLink = useMemo(() => buildPaymentLink(email), [email]);

  const fetchResults = async (silent = false) => {
    if (!submittedUrl) {
      setState({ loading: false, error: "Missing creator URL. Start a new analysis from the homepage.", data: null });
      return;
    }

    if (email && !EMAIL_PATTERN.test(email)) {
      setState((current) => ({
        ...current,
        loading: false,
        error: "Enter a valid email to connect payment unlocks to this kit.",
      }));
      return;
    }

    if (!silent) {
      setState((current) => ({ ...current, loading: true, error: "" }));
    }

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

      setState({ loading: false, error: "", data: payload });
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to analyze this channel",
        data: null,
      });
    }
  };

  useEffect(() => {
    void fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittedUrl, refreshTick]);

  useEffect(() => {
    if (!state.data || state.data.access_tier === "paid" || !email) {
      return;
    }

    const interval = window.setInterval(() => {
      void fetchResults(true);
    }, 12000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.data?.access_tier, email, submittedUrl, nicheNotes]);

  const handleRefreshWithEmail = () => {
    setRefreshTick((tick) => tick + 1);
  };

  const handleDownloadPack = async () => {
    if (!state.data?.kit_id) {
      return;
    }

    setDownloadPending(true);

    try {
      const response = await fetch("/api/download-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kit_id: state.data.kit_id }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to generate sponsorship pack");
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = "sponza-sponsorship-pack.zip";
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

  const kit = state.data;
  const isPaid = kit?.access_tier === "paid";
  const paidKit = kit && kit.access_tier === "paid" ? kit : null;
  const freeKit = kit && kit.access_tier === "free" ? kit : null;
  const creator = kit?.creator_profile;

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
            Sponza
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
            <a
              href={paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "var(--gold)",
                color: "var(--navy)",
                borderRadius: 999,
                padding: "11px 20px",
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Unlock Paid Kit — $29
            </a>
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
              {kit?.access_tier === "paid" ? "PAID PACK READY" : "ANALYSIS COMPLETE"}
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
              Sponza analyzed your channel, positioned your niche, priced your offer, and assembled the paid deliverables into a sponsor-ready pack.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 26,
              }}
            >
              {[submittedUrl, creator?.platform, creator?.niche].filter(Boolean).map((item) => (
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

            {!email ? (
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
                    CONNECT PAYMENT EMAIL
                  </p>
                  <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
                    Add the email you will use at checkout so Sponza can unlock your pack automatically after payment.
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
                    onClick={handleRefreshWithEmail}
                    style={{
                      border: "none",
                      borderRadius: 12,
                      background: "var(--gold)",
                      color: "var(--navy)",
                      fontWeight: 700,
                      padding: "12px 16px",
                      cursor: "pointer",
                    }}
                  >
                    Save Email
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
                    EMAIL CONNECTED
                  </p>
                  <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
                    Pay with <span style={{ color: "var(--warm-white)" }}>{email}</span> and this page will unlock automatically.
                  </p>
                </div>
                <button
                  onClick={() => void fetchResults()}
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
                  Refresh Unlock Status
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
                      : "Unlock the paid tier to turn this analysis into a professional sponsorship pack."}
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
                        : "Generated on demand at download time"
                      : email
                        ? "Watching for completed payment on this email"
                        : "Add an email before checkout to unlock this kit"}
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
                    ["Geographic focus", kit.access_tier === "paid" ? "Included in PDF media kit" : "Available in paid PDF kit"],
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
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 24,
                  padding: "26px 28px",
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
                  {freeKit ? (
                    <div
                      style={{
                        borderRadius: 999,
                        border: "1px solid rgba(245,166,35,0.24)",
                        background: "rgba(245,166,35,0.08)",
                        color: "var(--gold)",
                        padding: "8px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      +{freeKit.brand_matches_remaining} more in paid tier
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "grid", gap: 12 }}>
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
                          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            {isPaid ? brand.contact_detail : "Unlocked in paid pack"}
                          </p>
                        </div>
                      </div>
                      <p style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>{brand.why_match}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gap: 24 }}>
                <div
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 24,
                    padding: "26px 28px",
                  }}
                >
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", letterSpacing: "0.08em", marginBottom: 10 }}>
                    RATE CARD
                  </p>
                  <h2 className="font-display" style={{ fontSize: 30, lineHeight: 1.05, marginBottom: 14 }}>
                    {formatCurrency(kit.rate_card.range_low)} - {formatCurrency(kit.rate_card.range_high)}
                  </h2>
                  <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>
                    Quoted per {paidKit ? paidKit.rate_card.per : "campaign"}
                  </p>
                  {isPaid ? (
                    <div
                      style={{
                        borderRadius: 18,
                        overflow: "hidden",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {[
                        ["30s Integration", paidKit?.rate_card.breakdown.integration_30s || ""],
                        ["Dedicated Video", paidKit?.rate_card.breakdown.dedicated_video || ""],
                        ["Instagram Story", paidKit?.rate_card.breakdown.instagram_story || ""],
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
                  ) : (
                    <div
                      style={{
                        borderRadius: 18,
                        border: "1px dashed rgba(245,166,35,0.28)",
                        background: "rgba(245,166,35,0.06)",
                        padding: "18px 18px",
                        color: "var(--text-muted)",
                        lineHeight: 1.7,
                      }}
                    >
                      The paid pack expands this teaser into a polished pricing table inside the PDF media kit, including sponsor-ready line items.
                    </div>
                  )}
                </div>

                <div
                  style={{
                    background: "linear-gradient(180deg, rgba(15,27,45,0.8), rgba(245,166,35,0.08))",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 24,
                    padding: "26px 28px",
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
                      ? "Download a single ZIP that includes your designed PDF media kit, all 8 pitch emails, and the complete sponsor contact list."
                      : "Upgrade to unlock the professionally designed PDF media kit, the full 8-email outreach pack, and the sponsor contact CSV."}
                  </p>
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
                    <a
                      href={paymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "block",
                        textAlign: "center",
                        borderRadius: 16,
                        padding: "15px 18px",
                        background: "var(--gold)",
                        color: "var(--navy)",
                        fontWeight: 800,
                        fontSize: 15,
                        textDecoration: "none",
                      }}
                    >
                      Unlock Paid Kit — $29
                    </a>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
