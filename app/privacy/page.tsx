import type { Metadata } from "next";

import LegalPageShell, { type LegalSection } from "@/app/legal-page-shell";

const sections: LegalSection[] = [
  {
    title: "What data we collect",
    body: (
      <>
        <p style={{ margin: 0 }}>
          We keep the basics needed to build and deliver your kit: the YouTube channel URL you submit, the email
          address tied to your kit, and lightweight usage analytics that show us which parts of GetSponza are being
          used.
        </p>
        <p style={{ margin: 0 }}>
          We do not ask for your passwords or direct account access. GetSponza is designed to work from public creator
          data plus the details you choose to enter.
        </p>
      </>
    ),
  },
  {
    title: "How we use it",
    body: (
      <>
        <p style={{ margin: 0 }}>
          Your channel URL is used to generate your sponsorship kit, including the score, brand matches, and kit
          assets. Your email address is used to deliver your purchase and any follow-up materials tied to that kit.
        </p>
        <p style={{ margin: 0 }}>
          Usage analytics help us understand product performance, improve the creator experience, and catch broken
          flows before they affect more people.
        </p>
      </>
    ),
  },
  {
    title: "Data retention",
    body: (
      <>
        <p style={{ margin: 0 }}>
          Sponsorship kit data is stored for 90 days so you can revisit your results, unlock your purchase, and refresh
          your materials if needed.
        </p>
        <p style={{ margin: 0 }}>After that, the stored kit data is deleted from our active system.</p>
      </>
    ),
  },
  {
    title: "Third-party services",
    body: (
      <>
        <p style={{ margin: 0 }}>
          GetSponza relies on a few partners to operate the product: OpenAI for analysis, Resend for email delivery,
          Neon for storage, and Stripe for payment processing.
        </p>
        <p style={{ margin: 0 }}>
          Those services only get the data needed to do their job, and we do not sell creator data to advertisers or
          data brokers.
        </p>
      </>
    ),
  },
  {
    title: "Contact",
    body: (
      <p style={{ margin: 0 }}>
        Questions about privacy, deletion, or support can be sent to{" "}
        <a href="mailto:sponza@nanocorp.app" style={{ color: "var(--gold)" }}>
          sponza@nanocorp.app
        </a>
        .
      </p>
    ),
  },
];

export const metadata: Metadata = {
  title: "Privacy Policy — GetSponza",
  description: "GetSponza Privacy Policy — how we collect, use, and protect your data.",
  openGraph: {
    title: "Privacy Policy — GetSponza",
    description: "GetSponza Privacy Policy — how we collect, use, and protect your data.",
    type: "article",
  },
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      eyebrow="Privacy"
      title="Privacy Policy — GetSponza"
      intro="We built GetSponza for creators, not for harvesting data. This page explains what we collect, why we collect it, and how long we keep it in plain English."
      sections={sections}
    />
  );
}
