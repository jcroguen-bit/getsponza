import type { Metadata } from "next";

import LegalPageShell, { type LegalSection } from "@/app/legal-page-shell";

const sections: LegalSection[] = [
  {
    title: "What GetSponza provides",
    body: (
      <>
        <p style={{ margin: 0 }}>
          GetSponza analyzes creator information and generates a sponsorship kit that can include score insights, brand
          matches, a media kit, and outreach materials.
        </p>
        <p style={{ margin: 0 }}>
          It is a decision-support product, not a guarantee of sponsorship offers, brand replies, or closed deals.
        </p>
      </>
    ),
  },
  {
    title: "Payment & refunds",
    body: (
      <>
        <p style={{ margin: 0 }}>
          Paid kits are digital products delivered online. All sales are final once the kit has been generated or
          unlocked for delivery.
        </p>
        <p style={{ margin: 0 }}>
          If something breaks on our side, contact us and we will fix the delivery issue rather than promise a refund by
          default.
        </p>
      </>
    ),
  },
  {
    title: "Acceptable use",
    body: (
      <>
        <p style={{ margin: 0 }}>
          Use GetSponza for your own creator workflow. Do not scrape the platform, probe it for abuse, or resell the
          generated output as a competing service.
        </p>
        <p style={{ margin: 0 }}>
          We may restrict access if someone is using the product in a way that harms the platform, other creators, or
          our partners.
        </p>
      </>
    ),
  },
  {
    title: "Limitation of liability",
    body: (
      <>
        <p style={{ margin: 0 }}>
          GetSponza is provided on an as-is basis. We work to keep it accurate and available, but we cannot promise
          uninterrupted service or guarantee the business outcome of any sponsorship campaign.
        </p>
        <p style={{ margin: 0 }}>
          To the extent allowed by law, our liability is limited to the amount you paid for the specific GetSponza
          purchase tied to the issue.
        </p>
      </>
    ),
  },
  {
    title: "Contact",
    body: (
      <p style={{ margin: 0 }}>
        For support or terms-related questions, email{" "}
        <a href="mailto:sponza@nanocorp.app" style={{ color: "var(--gold)" }}>
          sponza@nanocorp.app
        </a>
        .
      </p>
    ),
  },
];

export const metadata: Metadata = {
  title: "Terms of Service — GetSponza",
  description: "GetSponza Terms of Service — the rules for using our sponsorship kit platform.",
  openGraph: {
    title: "Terms of Service — GetSponza",
    description: "GetSponza Terms of Service — the rules for using our sponsorship kit platform.",
    type: "article",
  },
};

export default function TermsPage() {
  return (
    <LegalPageShell
      eyebrow="Terms"
      title="Terms of Service — GetSponza"
      intro="These terms are meant to set expectations, not bury you in legal fog. If you use GetSponza, here are the simple rules around what the product does, what you can expect, and what you should not do with it."
      sections={sections}
    />
  );
}
