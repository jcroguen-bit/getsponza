import Link from "next/link";

export default function SuccessPage() {
  return (
    <main
      style={{
        background: "var(--navy)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          background: "var(--navy-light)",
          border: "1px solid var(--border)",
          borderRadius: 24,
          padding: "56px 48px",
          maxWidth: 520,
          width: "100%",
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 24 }}>🎉</div>
        <h1
          className="font-display"
          style={{
            fontSize: "clamp(28px, 4vw, 40px)",
            fontWeight: 900,
            letterSpacing: "-0.02em",
            marginBottom: 16,
          }}
        >
          Your kit is on its way.
        </h1>
        <p style={{ fontSize: 16, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 36 }}>
          We&rsquo;re putting the finishing touches on your sponsorship kit. You&rsquo;ll receive
          your media kit, matched brands, and pitch emails at the email you provided — typically
          within a few minutes.
        </p>
        <div
          style={{
            background: "rgba(245,166,35,0.08)",
            border: "1px solid rgba(245,166,35,0.2)",
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 32,
            textAlign: "left",
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--gold)", marginBottom: 8 }}>WHAT&rsquo;S INCLUDED</p>
          {[
            "27 matched brands with decision-maker contacts",
            "Professional PDF media kit",
            "5–10 personalized pitch emails",
            "Full rate card breakdown for your niche",
          ].map((item) => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ color: "var(--gold)" }}>✓</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{item}</span>
            </div>
          ))}
        </div>
        <Link
          href="/"
          style={{
            display: "inline-block",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "12px 28px",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--warm-white)",
            textDecoration: "none",
          }}
        >
          ← Back to Sponza
        </Link>
      </div>
    </main>
  );
}
