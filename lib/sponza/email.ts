import { Resend } from "resend";

let resend: Resend | null = null;

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }

  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }

  return resend;
}

export async function sendKitReadyEmail(params: {
  email: string;
  resultsUrl: string;
  downloadLabel?: string;
}) {
  const client = getResend();

  if (!client) {
    console.warn("Skipping kit ready email because RESEND_API_KEY is not configured");
    return { skipped: true };
  }

  await client.emails.send({
    from: "GetSponza <sponza@nanocorp.app>",
    to: params.email,
    subject: "Your GetSponza kit is ready",
    text: `Your kit is ready. Open ${params.resultsUrl} to ${params.downloadLabel || "download your sponsorship pack"}.`,
  });

  return { skipped: false };
}
