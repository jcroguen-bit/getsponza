"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function StarRating() {
  return (
    <span className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 14 14" fill="#F5A623">
          <path d="M7 1l1.5 3 3.5.5-2.5 2.5.6 3.5L7 9l-3.1 1.5.6-3.5L2 4.5 5.5 4z" />
        </svg>
      ))}
    </span>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [nicheNotes, setNicheNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError("Please enter your channel URL.");
      return;
    }

    if (email.trim() && !EMAIL_PATTERN.test(email.trim())) {
      setError("Enter a valid email if you want GetSponza to unlock your paid pack automatically.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/generate-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          email: email.trim() || undefined,
          niche_notes: nicheNotes.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as { kit_id?: number; error?: string };

      if (!response.ok || !payload.kit_id) {
        throw new Error(payload.error || "We couldn't analyze this URL.");
      }

      router.push(`/results/${payload.kit_id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "We couldn't analyze this URL.");
      setLoading(false);
    }
  };

  const faqs = [
    {
      q: "Is this really free?",
      a: "Yes. Your Sponsorship Readiness Score, top insights, and 3 brand previews are completely free — no account required. The full kit (20+ brands, media kit PDF, pitch emails) is a one-time $29 unlock.",
    },
    {
      q: "Which platforms do you support?",
      a: "We currently support YouTube, Instagram, and TikTok. Paste any public channel or profile URL and we'll detect the platform automatically.",
    },
    {
      q: "How accurate are the brand matches?",
      a: "Our team has built a matching database of 500+ brands actively seeking creator partnerships. We match based on your niche, audience size, engagement profile, and content style — not just follower count.",
    },
    {
      q: "What's in the complete kit?",
      a: "You get: 20+ matched brands with decision-maker contact routes, a professional PDF media kit, 5–10 personalized pitch emails ready to send, and a full rate card breakdown for your niche.",
    },
    {
      q: "Do I need to connect my accounts?",
      a: "No. We analyze publicly available data from your channel — no passwords, no OAuth. Just paste the URL.",
    },
    {
      q: "Can I refresh my kit later?",
      a: "Yes. Once your stats change significantly, you can refresh your entire kit for $19 (vs. $29 for new users). We recommend refreshing every 90 days.",
    },
  ];

  const testimonials = [
    {
      quote:
        "Landed a $1,200 deal with a skincare brand within 2 weeks of using GetSponza. The pitch email was so polished — the brand rep said it was the most professional outreach they'd received from a creator.",
      name: "Jake T.",
      stats: "87K followers · Lifestyle",
      avatar: "JT",
    },
    {
      quote:
        "I'd been trying to get brand deals for a year with no luck. GetSponza matched me with 3 brands I'd never heard of — but they were perfect fits. One of them became a 6-month partnership.",
      name: "Priya M.",
      stats: "52K followers · Beauty",
      avatar: "PM",
    },
    {
      quote:
        "The media kit alone was worth it. I used to cobble together a PDF in Canva. Now I just share the GetSponza kit and the response rate is night and day.",
      name: "Marcus B.",
      stats: "124K followers · Fitness",
      avatar: "MB",
    },
  ];

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
            maxWidth: 1140,
            margin: "0 auto",
            padding: "0 24px",
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            className="font-display"
            style={{ fontSize: 22, fontWeight: 800, color: "var(--gold)", letterSpacing: "-0.02em" }}
          >
            GetSponza
          </div>
          <a
            href="#analysis-form"
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
            Get Full Kit — $29
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          paddingTop: 100,
          paddingBottom: 100,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -120,
            left: "50%",
            transform: "translateX(-50%)",
            width: 900,
            height: 600,
            background: "radial-gradient(ellipse, rgba(245,166,35,0.07) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <div
            className="fade-in fade-in-delay-1"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(245,166,35,0.1)",
              border: "1px solid rgba(245,166,35,0.25)",
              borderRadius: 100,
              padding: "6px 16px",
              marginBottom: 32,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--gold)",
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--gold)", letterSpacing: "0.04em" }}>
              FREE SPONSORSHIP SCORE
            </span>
          </div>

          <h1
            className="font-display fade-in fade-in-delay-2"
            style={{
              fontSize: "clamp(46px, 7vw, 80px)",
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: "var(--warm-white)",
              marginBottom: 24,
            }}
          >
            Land your first
            <br />
            <span className="gold-shimmer">brand deal.</span>
          </h1>

          <p
            className="fade-in fade-in-delay-3"
            style={{
              fontSize: "clamp(16px, 2vw, 20px)",
              color: "var(--text-muted)",
              lineHeight: 1.6,
              marginBottom: 48,
              maxWidth: 560,
              margin: "0 auto 48px",
            }}
          >
            Paste your channel URL. We&rsquo;ll build your complete sponsorship kit —
            media kit, pitch emails, and 20+ matched brands — in under 2 minutes.
          </p>

          {/* URL Input */}
          <form id="analysis-form" onSubmit={handleSubmit} className="fade-in fade-in-delay-4" style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "grid",
                gap: 10,
                background: "rgba(255,255,255,0.05)",
                border: "1.5px solid rgba(255,255,255,0.12)",
                borderRadius: 18,
                padding: 10,
                maxWidth: 760,
                margin: "0 auto",
              }}
            >
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder="youtube.com/c/yourchannel  or  instagram.com/yourhandle"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "var(--warm-white)",
                    fontSize: 15,
                    padding: "12px 16px",
                    minWidth: 200,
                  }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: loading ? "rgba(245,166,35,0.6)" : "var(--gold)",
                    color: "var(--navy)",
                    border: "none",
                    borderRadius: 12,
                    padding: "12px 28px",
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: loading ? "wait" : "pointer",
                    whiteSpace: "nowrap",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {loading ? "Analyzing…" : "Get My Free Score →"}
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 10,
                }}
              >
                <input
                  type="email"
                  placeholder="Email for paid unlocks (optional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    outline: "none",
                    color: "var(--warm-white)",
                    fontSize: 14,
                    padding: "12px 14px",
                    width: "100%",
                  }}
                />
                <input
                  type="text"
                  placeholder="Optional niche notes: e.g. skincare routines, budget travel, endurance training"
                  value={nicheNotes}
                  onChange={(e) => setNicheNotes(e.target.value)}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    outline: "none",
                    color: "var(--warm-white)",
                    fontSize: 14,
                    padding: "12px 14px",
                    width: "100%",
                  }}
                />
              </div>
            </div>
            {error && (
              <p style={{ color: "#FF6B6B", fontSize: 13, marginTop: 8 }}>{error}</p>
            )}
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 10 }}>
              Add the same email you&rsquo;ll use at checkout if you want the paid sponsorship pack to unlock on the results page automatically.
            </p>
          </form>

          {/* Trust signals */}
          <div
            className="fade-in fade-in-delay-5"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 18 }}>👥</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                <strong style={{ color: "var(--warm-white)" }}>10,000+</strong> creators analyzed
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <StarRating />
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>4.9 / 5.0</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 18 }}>⚡</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>No account needed</span>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "80px 24px", borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.12em",
                color: "var(--gold)",
                marginBottom: 12,
              }}
            >
              HOW IT WORKS
            </p>
            <h2
              className="font-display"
              style={{
                fontSize: "clamp(28px, 4vw, 42px)",
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              Three steps to your first deal
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 2,
            }}
          >
            {[
              {
                n: "01",
                icon: "🔗",
                title: "Paste your URL",
                desc: "YouTube, Instagram, or TikTok. Any public channel or profile. We handle the rest.",
              },
              {
                n: "02",
                icon: "🔍",
                title: "We analyze your channel",
                desc: "Our team evaluates your niche, stats, audience demographics, engagement patterns, and brand alignment.",
              },
              {
                n: "03",
                icon: "📦",
                title: "Get your complete kit",
                desc: "Sponsorship Readiness Score, matched brands, pitch emails, and a professional media kit — ready to send.",
              },
            ].map((step, i) => (
              <div
                key={i}
                style={{
                  background: "var(--navy-light)",
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  padding: "36px 32px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 20,
                    right: 24,
                    fontSize: 48,
                    fontWeight: 900,
                    color: "rgba(255,255,255,0.04)",
                    fontFamily: "Playfair Display, serif",
                  }}
                >
                  {step.n}
                </div>
                <div style={{ fontSize: 32, marginBottom: 16 }}>{step.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "var(--warm-white)" }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section
        style={{
          padding: "80px 24px",
          background: "var(--navy-light)",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.12em",
                color: "var(--gold)",
                marginBottom: 12,
              }}
            >
              WHAT YOU GET
            </p>
            <h2
              className="font-display"
              style={{
                fontSize: "clamp(28px, 4vw, 42px)",
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              Everything you need to pitch brands
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {[
              {
                icon: "🎯",
                title: "Sponsorship Readiness Score",
                desc: "A 0–100 score with specific insights on what's working and what needs improvement before you pitch.",
                badge: "FREE",
                badgeColor: "var(--gold)",
              },
              {
                icon: "🏷️",
                title: "20+ Matched Brands",
                desc: "Brands actively seeking creators in your niche — with decision-maker contact routes included.",
                badge: "PAID",
                badgeColor: "var(--text-muted)",
              },
              {
                icon: "📄",
                title: "Professional Media Kit",
                desc: "A polished PDF designed to industry standards. Looks like it was made by a talent agency.",
                badge: "PAID",
                badgeColor: "var(--text-muted)",
              },
              {
                icon: "✉️",
                title: "5–10 Pitch Emails",
                desc: "Personalized outreach emails for each matched brand — written in your voice, ready to send.",
                badge: "PAID",
                badgeColor: "var(--text-muted)",
              },
              {
                icon: "💰",
                title: "Rate Card Benchmarks",
                desc: "What creators in your niche with your following actually charge. Know your worth before you negotiate.",
                badge: "TEASED FREE",
                badgeColor: "rgba(245,166,35,0.6)",
              },
              {
                icon: "🔄",
                title: "90-Day Refresh — $19",
                desc: "Stats change. Refresh your entire kit after 90 days for just $19. Stay current, keep pitching.",
                badge: "ADD-ON",
                badgeColor: "var(--text-muted)",
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  background: "var(--navy)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: "28px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: 28 }}>{item.icon}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      color: item.badgeColor,
                      border: `1px solid ${item.badgeColor}`,
                      borderRadius: 100,
                      padding: "3px 10px",
                    }}
                  >
                    {item.badge}
                  </span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--warm-white)" }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ padding: "80px 24px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.12em",
                color: "var(--gold)",
                marginBottom: 12,
              }}
            >
              CREATOR STORIES
            </p>
            <h2
              className="font-display"
              style={{
                fontSize: "clamp(28px, 4vw, 42px)",
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              Deals that happened
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            {testimonials.map((t, i) => (
              <div
                key={i}
                style={{
                  background: "var(--navy-light)",
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  padding: "32px 28px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                }}
              >
                <StarRating />
                <p style={{ fontSize: 15, color: "var(--warm-white)", lineHeight: 1.7, flex: 1 }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, var(--gold), var(--gold-dark))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--navy)",
                      flexShrink: 0,
                    }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: "var(--warm-white)" }}>{t.name}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{t.stats}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        style={{
          padding: "80px 24px",
          background: "var(--navy-light)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.12em",
                color: "var(--gold)",
                marginBottom: 12,
              }}
            >
              FAQ
            </p>
            <h2
              className="font-display"
              style={{
                fontSize: "clamp(28px, 4vw, 42px)",
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              Common questions
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {faqs.map((faq, i) => (
              <div
                key={i}
                style={{
                  background: "var(--navy)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "20px 24px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--warm-white)" }}>{faq.q}</span>
                  <span
                    style={{
                      fontSize: 20,
                      color: "var(--gold)",
                      transform: openFaq === i ? "rotate(45deg)" : "none",
                      transition: "transform 0.2s",
                      flexShrink: 0,
                    }}
                  >
                    +
                  </span>
                </button>
                {openFaq === i && (
                  <div
                    style={{
                      padding: "16px 24px 20px",
                      fontSize: 14,
                      color: "var(--text-muted)",
                      lineHeight: 1.7,
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section style={{ padding: "80px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2
            className="font-display"
            style={{
              fontSize: "clamp(32px, 5vw, 54px)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              marginBottom: 16,
            }}
          >
            Your score is waiting.
          </h2>
          <p style={{ fontSize: 17, color: "var(--text-muted)", marginBottom: 36, lineHeight: 1.6 }}>
            Free. No account. Takes 2 minutes.
          </p>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            style={{
              display: "inline-block",
              background: "var(--gold)",
              color: "var(--navy)",
              padding: "16px 40px",
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 17,
              textDecoration: "none",
            }}
          >
            Get My Free Score →
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "32px 24px" }}>
        <div
          style={{
            maxWidth: 1140,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div
            className="font-display"
            style={{ fontSize: 20, fontWeight: 800, color: "var(--gold)" }}
          >
            GetSponza
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[
              { label: "How it works", href: "#" },
              { label: "Pricing", href: "#analysis-form" },
              { label: "Privacy", href: "#" },
              { label: "Contact", href: "mailto:sponza@nanocorp.app" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}
              >
                {link.label}
              </a>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>© 2026 GetSponza. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
