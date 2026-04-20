"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const PAYMENT_LINK = "https://buy.stripe.com/00w9AUdhO7uT0Yi64zeP03a";

const MOCK_SCORE = 74;
const MOCK_CREATOR = {
  platform: "YouTube",
  handle: "SophiaGlowBeauty",
  followers: "45,200",
  engagement: "6.2%",
  niche: "Beauty & Lifestyle",
  avgViews: "18,400",
  postFreq: "2–3x / week",
};

const MOCK_BRANDS = [
  {
    name: "Versed Skincare",
    category: "Clean Beauty",
    logo: "VS",
    logoColor: "#7BC67B",
    match: 97,
    why: "Versed actively sponsors lifestyle creators in the 30K–100K range who cover clean beauty. Your audience skews 18–34F — an exact match for their target demographic.",
  },
  {
    name: "OLIPOP",
    category: "Wellness Beverage",
    logo: "OL",
    logoColor: "#F7A35C",
    match: 91,
    why: "OLIPOP runs an ongoing mid-tier creator program. Your health-adjacent lifestyle content and high engagement rate make you a strong candidate for their standard $800–$1,400 integration package.",
  },
  {
    name: "Parade Underwear",
    category: "Apparel / Lifestyle",
    logo: "PD",
    logoColor: "#C77DFF",
    match: 88,
    why: "Parade's creator brief explicitly calls for 'authentic lifestyle storytelling' — which matches your posting style. They typically offer product + cash for creators your size.",
  },
];

const BLURRED_BRANDS = [
  { name: "Tatcha", category: "Luxury Skincare", match: 85 },
  { name: "Daily Harvest", category: "Food & Wellness", match: 83 },
  { name: "Mejuri", category: "Fine Jewelry", match: 81 },
  { name: "Curology", category: "Skincare / DTC", match: 79 },
];

function ScoreGauge({ score }: { score: number }) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="200" height="200" viewBox="0 0 200 200" style={{ transform: "rotate(-90deg)" }}>
        {/* Background track */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="12"
        />
        {/* Score arc */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="url(#goldGrad)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F5A623" />
            <stop offset="100%" stopColor="#FFC95C" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center text */}
      <div
        style={{
          position: "absolute",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <span
          className="font-display"
          style={{ fontSize: 42, fontWeight: 900, color: "var(--warm-white)", lineHeight: 1 }}
        >
          {score}
        </span>
        <span style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>/ 100</span>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ResultsContent() {
  const params = useSearchParams();
  const submittedUrl = params.get("url") || "your channel";

  return (
    <main style={{ background: "var(--navy)", minHeight: "100vh" }}>
      {/* NAV */}
      <nav
        style={{
          borderBottom: "1px solid var(--border)",
          background: "rgba(15,27,45,0.9)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 1000,
            margin: "0 auto",
            padding: "0 24px",
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/"
            className="font-display"
            style={{ fontSize: 22, fontWeight: 800, color: "var(--gold)", textDecoration: "none" }}
          >
            Sponza
          </Link>
          <a
            href={PAYMENT_LINK}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "var(--gold)",
              color: "var(--navy)",
              padding: "8px 18px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Unlock Full Kit — $29
          </a>
        </div>
      </nav>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(245,166,35,0.1)",
              border: "1px solid rgba(245,166,35,0.2)",
              borderRadius: 100,
              padding: "5px 14px",
              marginBottom: 16,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4CAF50", display: "inline-block" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)", letterSpacing: "0.04em" }}>
              ANALYSIS COMPLETE
            </span>
          </div>
          <h1
            className="font-display"
            style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 8 }}
          >
            Your Sponsorship Readiness Report
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
            Based on our analysis of{" "}
            <span
              style={{
                color: "var(--warm-white)",
                background: "rgba(255,255,255,0.06)",
                padding: "2px 8px",
                borderRadius: 4,
                fontFamily: "monospace",
                fontSize: 13,
              }}
            >
              {submittedUrl}
            </span>
          </p>
        </div>

        {/* ===================== SECTION 1: SCORE ===================== */}
        <section
          style={{
            background: "var(--navy-light)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: "40px 36px",
            marginBottom: 24,
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "var(--gold)",
              marginBottom: 24,
            }}
          >
            SPONSORSHIP READINESS SCORE
          </p>

          <div
            style={{
              display: "flex",
              gap: 40,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            {/* Gauge */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <ScoreGauge score={MOCK_SCORE} />
              <div
                style={{
                  background: "rgba(245,166,35,0.12)",
                  border: "1px solid rgba(245,166,35,0.3)",
                  borderRadius: 8,
                  padding: "8px 20px",
                  textAlign: "center",
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--gold)" }}>
                  Strong Potential
                </span>
              </div>
            </div>

            {/* Channel summary + insights */}
            <div style={{ flex: 1, minWidth: 240 }}>
              {/* Channel stats */}
              <div
                style={{
                  display: "flex",
                  gap: 20,
                  flexWrap: "wrap",
                  marginBottom: 28,
                  paddingBottom: 24,
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {[
                  { label: "Platform", value: MOCK_CREATOR.platform },
                  { label: "Subscribers", value: MOCK_CREATOR.followers },
                  { label: "Engagement", value: MOCK_CREATOR.engagement },
                  { label: "Avg. Views", value: MOCK_CREATOR.avgViews },
                  { label: "Niche", value: MOCK_CREATOR.niche },
                  { label: "Posting Freq.", value: MOCK_CREATOR.postFreq },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.05em", marginBottom: 2 }}>
                      {stat.label.toUpperCase()}
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--warm-white)" }}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Insights */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  {
                    icon: "✅",
                    text: "Your engagement rate (6.2%) is well above average for beauty/lifestyle creators at your size.",
                  },
                  {
                    icon: "✅",
                    text: "Your posting consistency (2–3x per week) signals reliability — a top factor brands evaluate.",
                  },
                  {
                    icon: "✅",
                    text: "Your content-to-promotion ratio is strong. Brands see you as authentic, not ad-heavy.",
                  },
                  {
                    icon: "⚠️",
                    text: "Niche positioning could be sharpened. Clearer topical focus would attract higher-CPM sponsors.",
                  },
                ].map((insight, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{insight.icon}</span>
                    <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>{insight.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===================== SECTION 2: BRAND MATCHES ===================== */}
        <section
          style={{
            background: "var(--navy-light)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: "40px 36px",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: 28,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  color: "var(--gold)",
                  marginBottom: 6,
                }}
              >
                BRAND MATCHES
              </p>
              <h2
                className="font-display"
                style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}
              >
                27 brands matched your profile
              </h2>
            </div>
            <span
              style={{
                background: "rgba(245,166,35,0.12)",
                border: "1px solid rgba(245,166,35,0.25)",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--gold)",
              }}
            >
              3 of 27 shown
            </span>
          </div>

          {/* Visible brands */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
            {MOCK_BRANDS.map((brand, i) => (
              <div
                key={i}
                style={{
                  background: "var(--navy)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: "22px 24px",
                  display: "flex",
                  gap: 20,
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                {/* Logo */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: `${brand.logoColor}22`,
                    border: `1px solid ${brand.logoColor}44`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 700,
                    color: brand.logoColor,
                    flexShrink: 0,
                  }}
                >
                  {brand.logo}
                </div>

                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--warm-white)" }}>{brand.name}</h3>
                    <span
                      style={{
                        fontSize: 11,
                        background: "rgba(255,255,255,0.06)",
                        borderRadius: 6,
                        padding: "2px 8px",
                        color: "var(--text-muted)",
                      }}
                    >
                      {brand.category}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--gold)",
                        marginLeft: "auto",
                      }}
                    >
                      {brand.match}% match
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{brand.why}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Blurred brands */}
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, filter: "blur(5px)", pointerEvents: "none" }}>
              {BLURRED_BRANDS.map((b, i) => (
                <div
                  key={i}
                  style={{
                    background: "var(--navy)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    padding: "22px 24px",
                    display: "flex",
                    gap: 20,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.04)",
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{b.name}</p>
                    <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{b.category} · {b.match}% match</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "linear-gradient(to bottom, transparent 0%, rgba(15,27,45,0.7) 40%, rgba(15,27,45,0.95) 100%)",
                borderRadius: 14,
                gap: 16,
              }}
            >
              <p style={{ fontSize: 18, fontWeight: 700, color: "var(--warm-white)", textAlign: "center" }}>
                + 24 more brands matched for your niche
              </p>
              <a
                href={PAYMENT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: "var(--gold)",
                  color: "var(--navy)",
                  padding: "12px 28px",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                }}
              >
                Unlock All 27 Brands →
              </a>
            </div>
          </div>
        </section>

        {/* ===================== SECTION 3: PITCH EMAIL PREVIEW ===================== */}
        <section
          style={{
            background: "var(--navy-light)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: "40px 36px",
            marginBottom: 24,
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "var(--gold)",
              marginBottom: 24,
            }}
          >
            PITCH EMAIL PREVIEW
          </p>

          <div
            style={{
              background: "var(--navy)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            {/* Email header */}
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 40 }}>To:</span>
                <span style={{ fontSize: 12, color: "var(--warm-white)" }}>partnerships@versedskincarecare.com</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 40 }}>Subj:</span>
                <span style={{ fontSize: 12, color: "var(--warm-white)", fontWeight: 600 }}>
                  Partnership Proposal — SophiaGlowBeauty (45K, 6.2% ER, Beauty/Lifestyle)
                </span>
              </div>
            </div>

            {/* Email body — first lines visible */}
            <div style={{ padding: "24px 24px 0" }}>
              <p style={{ fontSize: 14, color: "var(--warm-white)", lineHeight: 1.8, marginBottom: 12 }}>
                Hi [Name],
              </p>
              <p style={{ fontSize: 14, color: "var(--warm-white)", lineHeight: 1.8, marginBottom: 12 }}>
                My name is Sophia — I run SophiaGlowBeauty on YouTube, where I create honest skincare and
                lifestyle content for an audience of 45,000+ subscribers. My engagement rate sits at 6.2%,
                which I&rsquo;m told is roughly 2× the industry average for channels my size.
              </p>
              <p style={{ fontSize: 14, color: "var(--warm-white)", lineHeight: 1.8, marginBottom: 24 }}>
                I&rsquo;ve been a Versed customer for about 8 months. Your Clean Screen SPF formula has become
                a staple in my routine, and I believe a partnership would resonate authentically with my audience
                because...
              </p>
            </div>

            {/* Blurred continuation */}
            <div style={{ position: "relative" }}>
              <div
                style={{
                  padding: "0 24px 24px",
                  filter: "blur(4px)",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              >
                <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.8, marginBottom: 12 }}>
                  Lorem ipsum dolor sit amet consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
                  labore et dolore magna aliqua. Ut enim ad minim veniam quis nostrud exercitation ullamco.
                </p>
                <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.8, marginBottom: 12 }}>
                  Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
                  pariatur. Excepteur sint occaecat cupidatat non proident sunt in culpa qui officia.
                </p>
                <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.8 }}>
                  Best regards,
                  <br />
                  Sophia
                </p>
              </div>

              {/* Lock overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(to bottom, transparent, rgba(15,27,45,0.9))",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "rgba(245,166,35,0.15)",
                      border: "1px solid rgba(245,166,35,0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--gold)",
                    }}
                  >
                    <LockIcon />
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    5–10 pitch emails included in full kit
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== SECTION 4: RATE CARD TEASER ===================== */}
        <section
          style={{
            background: "var(--navy-light)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: "40px 36px",
            marginBottom: 24,
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "var(--gold)",
              marginBottom: 24,
            }}
          >
            RATE CARD BENCHMARKS
          </p>

          {/* Teaser range */}
          <div
            style={{
              background: "rgba(245,166,35,0.06)",
              border: "1px solid rgba(245,166,35,0.2)",
              borderRadius: 14,
              padding: "28px 28px",
              marginBottom: 20,
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 8 }}>
              Beauty/lifestyle creators with 40K–55K subscribers typically earn
            </p>
            <p
              className="font-display"
              style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, color: "var(--gold)", letterSpacing: "-0.02em" }}
            >
              $650 – $1,400
            </p>
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 8 }}>per integrated post</p>
          </div>

          {/* Blurred breakdown table */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                background: "var(--navy)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                overflow: "hidden",
                filter: "blur(5px)",
                pointerEvents: "none",
              }}
            >
              {[
                ["Dedicated video", "1× brand mention", "$1,100–$1,800"],
                ["Integrated mention (60s)", "Mid-roll placement", "$600–$950"],
                ["Short/Reel", "30s brand focus", "$300–$500"],
                ["Instagram story (3 frames)", "Swipe-up link", "$180–$320"],
                ["Story + post bundle", "Full package", "$850–$1,400"],
              ].map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    padding: "14px 20px",
                    borderBottom: i < 4 ? "1px solid var(--border)" : "none",
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                  }}
                >
                  {row.map((cell, j) => (
                    <span
                      key={j}
                      style={{
                        fontSize: 13,
                        color: j === 2 ? "var(--gold)" : "var(--text-muted)",
                        fontWeight: j === 2 ? 600 : 400,
                      }}
                    >
                      {cell}
                    </span>
                  ))}
                </div>
              ))}
            </div>

            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(15,27,45,0.6)",
                borderRadius: 12,
              }}
            >
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "rgba(245,166,35,0.15)",
                    border: "1px solid rgba(245,166,35,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--gold)",
                  }}
                >
                  <LockIcon />
                </div>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Full rate breakdown in your kit</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== SECTION 5: PDF KIT PREVIEW ===================== */}
        <section
          style={{
            background: "var(--navy-light)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: "40px 36px",
            marginBottom: 24,
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "var(--gold)",
              marginBottom: 24,
            }}
          >
            YOUR MEDIA KIT
          </p>

          <div
            style={{
              position: "relative",
              background: "var(--navy)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              overflow: "hidden",
              aspectRatio: "16/9",
              maxHeight: 320,
            }}
          >
            {/* Mock PDF content */}
            <div
              style={{
                padding: "32px 36px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                filter: "blur(3px)",
                pointerEvents: "none",
              }}
            >
              {/* PDF header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div
                    style={{
                      width: 100,
                      height: 14,
                      background: "rgba(245,166,35,0.6)",
                      borderRadius: 3,
                      marginBottom: 8,
                    }}
                  />
                  <div style={{ width: 180, height: 10, background: "rgba(255,255,255,0.15)", borderRadius: 3 }} />
                </div>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    background: "rgba(245,166,35,0.15)",
                    border: "1px solid rgba(245,166,35,0.3)",
                  }}
                />
              </div>

              <div style={{ height: 1, background: "var(--border)" }} />

              <div style={{ display: "flex", gap: 20 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                  {[140, 120, 160, 100].map((w, i) => (
                    <div
                      key={i}
                      style={{ width: w, height: 10, background: "rgba(255,255,255,0.12)", borderRadius: 3 }}
                    />
                  ))}
                </div>
                <div
                  style={{
                    width: 140,
                    height: 100,
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid var(--border)",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: 60,
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid var(--border)",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Watermark */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(15,27,45,0.5)",
              }}
            >
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    background: "rgba(245,166,35,0.1)",
                    border: "1px solid rgba(245,166,35,0.3)",
                    borderRadius: 12,
                    padding: "16px 28px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 28 }}>📄</span>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "var(--warm-white)" }}>Your Media Kit</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Professional PDF · Ready to send</p>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Included in your complete kit</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== CTA BLOCK ===================== */}
        <section
          style={{
            background: "linear-gradient(135deg, rgba(245,166,35,0.12) 0%, rgba(245,166,35,0.04) 100%)",
            border: "1px solid rgba(245,166,35,0.3)",
            borderRadius: 20,
            padding: "48px 36px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(245,166,35,0.1)",
              border: "1px solid rgba(245,166,35,0.25)",
              borderRadius: 100,
              padding: "5px 14px",
              marginBottom: 20,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gold)", letterSpacing: "0.04em" }}>
              YOUR COMPLETE KIT IS READY
            </span>
          </div>

          <h2
            className="font-display"
            style={{
              fontSize: "clamp(28px, 4vw, 42px)",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              marginBottom: 12,
            }}
          >
            Unlock everything for $29
          </h2>

          <p style={{ fontSize: 16, color: "var(--text-muted)", marginBottom: 36, maxWidth: 480, margin: "0 auto 36px" }}>
            Get your 27 matched brands with contact routes, professional PDF media kit,
            5–10 ready-to-send pitch emails, and full rate card breakdown.
          </p>

          <a
            href={PAYMENT_LINK}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              background: "var(--gold)",
              color: "var(--navy)",
              padding: "18px 48px",
              borderRadius: 14,
              fontWeight: 700,
              fontSize: 18,
              textDecoration: "none",
              marginBottom: 20,
              letterSpacing: "-0.01em",
            }}
          >
            Get My Complete Kit — $29 →
          </a>

          <div
            style={{
              display: "flex",
              gap: 24,
              justifyContent: "center",
              flexWrap: "wrap",
              marginTop: 20,
            }}
          >
            {[
              { icon: "💳", text: "One-time payment" },
              { icon: "🚫", text: "No subscription" },
              { icon: "⚡", text: "Delivered instantly" },
              { icon: "🔄", text: "Refresh in 90 days for $19" },
            ].map((item) => (
              <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{item.text}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div style={{ background: "var(--navy)", minHeight: "100vh" }} />}>
      <ResultsContent />
    </Suspense>
  );
}
