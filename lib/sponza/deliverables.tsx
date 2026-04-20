import JSZip from "jszip";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

import type { BrandMatch, KitRecord, PitchEmail } from "@/lib/sponza/types";

const colors = {
  navy: "#0F1B2D",
  gold: "#F5A623",
  goldSoft: "#FFF4E1",
  white: "#FFFFFF",
  ink: "#122033",
  muted: "#5E6878",
  line: "#D7DEE7",
  surface: "#F6F7F9",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.white,
    color: colors.ink,
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.5,
    paddingTop: 0,
    paddingBottom: 54,
    paddingHorizontal: 0,
  },
  hero: {
    backgroundColor: colors.navy,
    color: colors.white,
    paddingTop: 42,
    paddingBottom: 34,
    paddingHorizontal: 42,
    position: "relative",
  },
  heroAccent: {
    position: "absolute",
    top: 0,
    left: 42,
    width: 92,
    height: 5,
    backgroundColor: colors.gold,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  heroKicker: {
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: "#D8B57B",
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.15,
    marginBottom: 10,
  },
  heroMetaRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  heroPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  heroSummary: {
    maxWidth: 455,
    color: "#DDE4EF",
    fontSize: 11,
  },
  body: {
    paddingHorizontal: 42,
    paddingTop: 24,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  metricCard: {
    width: "48%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  metricLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    color: colors.muted,
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    color: colors.navy,
    marginBottom: 2,
  },
  metricSubtext: {
    fontSize: 9,
    color: colors.muted,
  },
  columns: {
    flexDirection: "row",
    gap: 18,
    alignItems: "flex-start",
  },
  column: {
    flex: 1,
    gap: 14,
  },
  section: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
  },
  sectionEyebrow: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1.3,
    color: colors.gold,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: colors.navy,
    marginBottom: 8,
  },
  bodyText: {
    color: colors.ink,
  },
  demographicRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 7,
    gap: 12,
  },
  demographicRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  demographicLabel: {
    color: colors.muted,
  },
  demographicValue: {
    color: colors.navy,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  rateRange: {
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: "#F7D9A7",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  rateRangeValue: {
    color: colors.navy,
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    marginBottom: 4,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.navy,
    color: colors.white,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  tableHeaderCell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  tableCell: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    fontSize: 10,
  },
  notesCard: {
    marginTop: 14,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  noteItem: {
    color: colors.muted,
    marginBottom: 5,
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 42,
    right: 42,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 9,
    color: colors.muted,
  },
  footerContact: {
    maxWidth: 360,
  },
});

function formatNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-US").format(value);
}

function formatCurrency(value: number | null | undefined, currency = "USD") {
  if (value == null || !Number.isFinite(value)) {
    return "TBD";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "creator";
}

function csvEscape(value: string | null | undefined) {
  const normalized = value ?? "";
  return `"${normalized.replace(/"/g, '""')}"`;
}

function buildAboutChannel(record: KitRecord) {
  const profile = record.full_kit_json.creator_profile;
  const geography = record.scrape_json?.country || "a global audience";

  return [
    `${profile.name} runs a ${profile.platform} channel rooted in ${profile.niche.toLowerCase()} content and a ${profile.content_style.toLowerCase()} presentation style.`,
    `The audience skews ${profile.audience_age} with ${profile.audience_gender.toLowerCase()} representation, and the strongest geographic focus is ${geography}.`,
    `The channel averages ${formatNumber(profile.avg_views)} views per post and maintains a ${profile.posting_frequency.toLowerCase()} publishing rhythm.`,
  ].join(" ");
}

function buildPackFileStem(record: KitRecord) {
  return slugify(record.full_kit_json.creator_profile.name);
}

function buildPitchEmailsText(pitchEmails: PitchEmail[]) {
  return pitchEmails
    .map(
      (email, index) =>
        [
          `${index + 1}. ${email.brand}`,
          `Subject: ${email.subject}`,
          "",
          email.body.trim(),
        ].join("\n")
    )
    .join("\n\n------------------------------------------------------------\n\n");
}

function buildBrandListCsv(brandMatches: BrandMatch[]) {
  const lines = [
    "brand name,category,contact route,contact detail,last verified",
    ...brandMatches.map((match) =>
      [
        csvEscape(match.brand),
        csvEscape(match.category),
        csvEscape(match.contact_route),
        csvEscape(match.contact_detail),
        csvEscape(match.last_verified),
      ].join(",")
    ),
  ];

  return lines.join("\n");
}

function MediaKitDocument({ record }: { record: KitRecord }) {
  const kit = record.full_kit_json;
  const profile = kit.creator_profile;
  const geography = record.scrape_json?.country || "Global / not disclosed";
  const contactLine = [record.email || "No email provided", record.normalized_url || record.url].join("  •  ");

  return (
    <Document
      author="GetSponza"
      title={`${profile.name} Media Kit`}
      subject="Sponsorship media kit"
      language="en-US"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.hero}>
          <View style={styles.heroAccent} />
          <Text style={styles.heroKicker}>Creator Media Kit</Text>
          <Text style={styles.heroTitle}>{profile.name}</Text>
          <View style={styles.heroMetaRow}>
            <Text style={styles.heroPill}>{profile.platform}</Text>
            <Text style={styles.heroPill}>{profile.niche}</Text>
          </View>
          <Text style={styles.heroSummary}>{kit.media_kit_summary}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.metricsGrid}>
            {[
              {
                label: "Followers",
                value: formatNumber(profile.followers),
                subtext: "Current audience size",
              },
              {
                label: "Avg views",
                value: formatNumber(profile.avg_views),
                subtext: "Typical views per post",
              },
              {
                label: "Engagement rate",
                value: profile.engagement_rate,
                subtext: "Audience interaction quality",
              },
              {
                label: "Posting frequency",
                value: profile.posting_frequency,
                subtext: "Consistent publishing cadence",
              },
            ].map((metric) => (
              <View key={metric.label} style={styles.metricCard}>
                <Text style={styles.metricLabel}>{metric.label}</Text>
                <Text style={styles.metricValue}>{metric.value}</Text>
                <Text style={styles.metricSubtext}>{metric.subtext}</Text>
              </View>
            ))}
          </View>

          <View style={styles.columns}>
            <View style={styles.column}>
              <View style={styles.section}>
                <Text style={styles.sectionEyebrow}>Audience</Text>
                <Text style={styles.sectionTitle}>Audience Demographics</Text>
                {[
                  ["Age range", profile.audience_age],
                  ["Gender split", profile.audience_gender],
                  ["Geographic focus", geography],
                ].map(([label, value], index, items) => (
                  <View
                    key={label}
                    style={
                      index === items.length - 1
                        ? [styles.demographicRow, styles.demographicRowLast]
                        : styles.demographicRow
                    }
                  >
                    <Text style={styles.demographicLabel}>{label}</Text>
                    <Text style={styles.demographicValue}>{value}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionEyebrow}>Positioning</Text>
                <Text style={styles.sectionTitle}>Niche Positioning</Text>
                <Text style={styles.bodyText}>{kit.media_kit_summary}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionEyebrow}>Profile</Text>
                <Text style={styles.sectionTitle}>About the Channel</Text>
                <Text style={styles.bodyText}>{buildAboutChannel(record)}</Text>
              </View>
            </View>

            <View style={styles.column}>
              <View style={styles.section}>
                <Text style={styles.sectionEyebrow}>Rates</Text>
                <Text style={styles.sectionTitle}>Rate Card</Text>
                <View style={styles.rateRange}>
                  <Text style={styles.metricLabel}>Typical campaign range</Text>
                  <Text style={styles.rateRangeValue}>
                    {formatCurrency(kit.rate_card.range_low, kit.rate_card.currency)} -{" "}
                    {formatCurrency(kit.rate_card.range_high, kit.rate_card.currency)}
                  </Text>
                  <Text style={styles.metricSubtext}>Quoted {kit.rate_card.per}</Text>
                </View>

                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={styles.tableHeaderCell}>Deliverable</Text>
                    <Text style={styles.tableHeaderCell}>Rate</Text>
                  </View>
                  {[
                    ["30s Integration", kit.rate_card.breakdown.integration_30s],
                    ["Dedicated Video", kit.rate_card.breakdown.dedicated_video],
                    ["Instagram Story", kit.rate_card.breakdown.instagram_story],
                  ].map(([label, value]) => (
                    <View key={label} style={styles.tableRow}>
                      <Text style={styles.tableCell}>{label}</Text>
                      <Text style={styles.tableCell}>{value}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.notesCard}>
                  {[
                    `Readiness score: ${kit.readiness_score}/100 (${kit.readiness_label})`,
                    `Primary style: ${profile.content_style}`,
                    `Prepared for sponsor outreach with GetSponza`,
                  ].map((note) => (
                    <Text key={note} style={styles.noteItem}>
                      {`• ${note}`}
                    </Text>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>

        <View fixed style={styles.footer}>
          <Text style={styles.footerContact}>{contactLine}</Text>
          <Text>Prepared by GetSponza</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderMediaKitPdf(record: KitRecord) {
  return renderToBuffer(<MediaKitDocument record={record} />);
}

export async function buildSponsorshipPack(record: KitRecord) {
  const zip = new JSZip();
  const mediaKitPdf = await renderMediaKitPdf(record);
  const pitchEmailsText = buildPitchEmailsText(record.full_kit_json.pitch_emails);
  const brandListCsv = buildBrandListCsv(record.full_kit_json.brand_matches);

  zip.file("media_kit.pdf", mediaKitPdf);
  zip.file("pitch_emails.txt", pitchEmailsText);
  zip.file("brand_list.csv", brandListCsv);

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

  return {
    fileStem: buildPackFileStem(record),
    mediaKitPdf,
    zipBuffer,
  };
}
