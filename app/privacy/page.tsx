export default function PrivacyPage() {
  return (
    <main style={{ background: "var(--navy)", minHeight: "100vh", padding: "80px 24px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <a
          href="/"
          style={{ fontSize: 13, color: "var(--gold)", textDecoration: "none", display: "inline-block", marginBottom: 32 }}
        >
          ← Back to GetSponza
        </a>
        <h1
          className="font-display"
          style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 32 }}
        >
          Privacy Policy
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 40 }}>Last updated: April 2026</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 32, color: "var(--text-muted)", lineHeight: 1.7 }}>
          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--warm-white)", marginBottom: 12 }}>What We Collect</h2>
            <p>When you use GetSponza, we collect the public channel URL you submit and, optionally, your email address if you provide it. We also collect publicly available data from your social media profiles (follower count, engagement rate, content categories) to generate your sponsorship report.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--warm-white)", marginBottom: 12 }}>How We Use It</h2>
            <p>Your channel URL and public data are used solely to generate your Sponsorship Readiness Score and brand match report. If you provide an email address, we use it to deliver your paid kit and send transactional emails related to your order. We do not sell your data to third parties.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--warm-white)", marginBottom: 12 }}>Data Retention</h2>
            <p>Kit records are stored in our database to allow you to access your results and unlock paid content. You may request deletion of your data at any time by contacting us at sponza@nanocorp.app.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--warm-white)", marginBottom: 12 }}>Cookies</h2>
            <p>GetSponza does not use tracking cookies. We use essential session storage only to maintain your in-page state.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--warm-white)", marginBottom: 12 }}>Contact</h2>
            <p>Questions about this policy? Email us at <a href="mailto:sponza@nanocorp.app" style={{ color: "var(--gold)" }}>sponza@nanocorp.app</a>.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
