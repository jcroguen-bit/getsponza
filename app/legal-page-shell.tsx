import type { ReactNode } from "react";

import { Inter } from "next/font/google";
import Link from "next/link";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export type LegalSection = {
  title: string;
  body: ReactNode;
};

type LegalPageShellProps = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
};

export default function LegalPageShell({
  eyebrow,
  title,
  intro,
  sections,
}: LegalPageShellProps) {
  return (
    <main
      className={inter.className}
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(245,166,35,0.14), transparent 30%), linear-gradient(180deg, #091321 0%, #0F1B2D 44%, #13233A 100%)",
      }}
    >
      <div className="noise" style={{ position: "relative" }}>
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "32px 24px 96px",
          }}
        >
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 28,
              color: "var(--gold)",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.02em",
              textDecoration: "none",
            }}
          >
            ← Back to GetSponza
          </Link>

          <section
            style={{
              padding: "34px clamp(24px, 4vw, 40px)",
              borderRadius: 32,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.04))",
              boxShadow: "0 28px 80px rgba(0,0,0,0.3)",
              marginBottom: 28,
            }}
          >
            <p
              style={{
                margin: "0 0 16px",
                color: "var(--gold)",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              {eyebrow}
            </p>
            <h1
              style={{
                margin: 0,
                color: "var(--warm-white)",
                fontSize: "clamp(40px, 6vw, 62px)",
                lineHeight: 1,
                letterSpacing: "-0.05em",
              }}
            >
              {title}
            </h1>
            <p
              style={{
                margin: "20px 0 0",
                maxWidth: 700,
                color: "rgba(250,250,248,0.8)",
                fontSize: "clamp(17px, 2vw, 20px)",
                lineHeight: 1.75,
              }}
            >
              {intro}
            </p>
          </section>

          <section
            style={{
              display: "grid",
              gap: 18,
            }}
          >
            {sections.map((section) => (
              <article
                key={section.title}
                style={{
                  borderRadius: 26,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  padding: "24px clamp(20px, 3vw, 30px)",
                }}
              >
                <h2
                  style={{
                    margin: "0 0 14px",
                    color: "var(--warm-white)",
                    fontSize: 24,
                    fontWeight: 700,
                    letterSpacing: "-0.03em",
                  }}
                >
                  {section.title}
                </h2>
                <div
                  style={{
                    display: "grid",
                    gap: 14,
                    color: "rgba(250,250,248,0.78)",
                    fontSize: 16,
                    lineHeight: 1.75,
                  }}
                >
                  {section.body}
                </div>
              </article>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
