/**
 * SIEM Integration Module
 * 
 * Dispatches threat intelligence payloads to configured SIEM backends.
 * Each integration is opt-in — only fires if the corresponding env variable is set.
 */

export interface ThreatIntelPayload {
  timestamp: string;
  username: string;
  password: string;
  ipv4: string | null;
  ipv6: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  asn: string | null;
  isp: string | null;
  userAgent: string;
  source: string;
}

// ─── Slack Webhook ──────────────────────────────────────────────────────────────

async function sendToSlack(payload: ThreatIntelPayload): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "🍯 *Honeypot Alert — Credential Capture*",
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "🍯 Honeypot Credential Capture", emoji: true },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Timestamp:*\n${payload.timestamp}` },
            { type: "mrkdwn", text: `*Source:*\n${payload.source}` },
            { type: "mrkdwn", text: `*Username:*\n\`${payload.username}\`` },
            { type: "mrkdwn", text: `*Password:*\n\`${payload.password}\`` },
            { type: "mrkdwn", text: `*IPv4:*\n${payload.ipv4 || "N/A"}` },
            { type: "mrkdwn", text: `*IPv6:*\n${payload.ipv6 || "N/A"}` },
            { type: "mrkdwn", text: `*Location:*\n${[payload.city, payload.region, payload.country].filter(Boolean).join(", ") || "N/A"}` },
            { type: "mrkdwn", text: `*ISP / ASN:*\n${payload.isp || "N/A"} (${payload.asn || "N/A"})` },
          ],
        },
        {
          type: "context",
          elements: [
            { type: "mrkdwn", text: `*User-Agent:* ${payload.userAgent}` },
          ],
        },
      ],
    }),
  });
}

// ─── Discord Webhook ────────────────────────────────────────────────────────────

async function sendToDiscord(payload: ThreatIntelPayload): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: "🍯 Honeypot Credential Capture",
          color: 0xff4444,
          fields: [
            { name: "Username", value: `\`${payload.username}\``, inline: true },
            { name: "Password", value: `\`${payload.password}\``, inline: true },
            { name: "IPv4", value: payload.ipv4 || "N/A", inline: true },
            { name: "IPv6", value: payload.ipv6 || "N/A", inline: true },
            { name: "Location", value: [payload.city, payload.region, payload.country].filter(Boolean).join(", ") || "N/A", inline: true },
            { name: "ISP / ASN", value: `${payload.isp || "N/A"} (${payload.asn || "N/A"})`, inline: true },
            { name: "User-Agent", value: payload.userAgent },
          ],
          timestamp: payload.timestamp,
          footer: { text: `Source: ${payload.source}` },
        },
      ],
    }),
  });
}

// ─── Microsoft Teams Webhook ────────────────────────────────────────────────────

async function sendToTeams(payload: ThreatIntelPayload): Promise<void> {
  const url = process.env.TEAMS_WEBHOOK_URL;
  if (!url) return;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      themeColor: "FF4444",
      summary: "Honeypot Credential Capture",
      sections: [
        {
          activityTitle: "🍯 Honeypot Credential Capture",
          facts: [
            { name: "Timestamp", value: payload.timestamp },
            { name: "Username", value: payload.username },
            { name: "Password", value: payload.password },
            { name: "IPv4", value: payload.ipv4 || "N/A" },
            { name: "IPv6", value: payload.ipv6 || "N/A" },
            { name: "Location", value: [payload.city, payload.region, payload.country].filter(Boolean).join(", ") || "N/A" },
            { name: "ISP / ASN", value: `${payload.isp || "N/A"} (${payload.asn || "N/A"})` },
            { name: "User-Agent", value: payload.userAgent },
          ],
          markdown: true,
        },
      ],
    }),
  });
}

// ─── Grafana Loki ───────────────────────────────────────────────────────────────

async function sendToLoki(payload: ThreatIntelPayload): Promise<void> {
  const url = process.env.LOKI_URL;
  if (!url) return;

  const timestampNs = (new Date(payload.timestamp).getTime() * 1_000_000).toString();

  await fetch(`${url}/loki/api/v1/push`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      streams: [
        {
          stream: {
            job: "honeypot",
            source: payload.source,
            level: "warn",
          },
          values: [[timestampNs, JSON.stringify(payload)]],
        },
      ],
    }),
  });
}

// ─── Graylog (GELF) ────────────────────────────────────────────────────────────

async function sendToGraylog(payload: ThreatIntelPayload): Promise<void> {
  const url = process.env.GRAYLOG_URL;
  if (!url) return;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      version: "1.1",
      host: "honeypot",
      short_message: `Credential capture: ${payload.username}`,
      timestamp: new Date(payload.timestamp).getTime() / 1000,
      level: 4,
      _username: payload.username,
      _password: payload.password,
      _ipv4: payload.ipv4,
      _ipv6: payload.ipv6,
      _city: payload.city,
      _region: payload.region,
      _country: payload.country,
      _asn: payload.asn,
      _isp: payload.isp,
      _user_agent: payload.userAgent,
      _source_page: payload.source,
    }),
  });
}

// ─── ELK / Elasticsearch ───────────────────────────────────────────────────────

async function sendToElasticsearch(payload: ThreatIntelPayload): Promise<void> {
  const url = process.env.ELASTICSEARCH_URL;
  const index = process.env.ELASTICSEARCH_INDEX || "honeypot-logs";
  if (!url) return;

  const headers: Record<string, string> = { "Content-Type": "application/json" };

  // Support optional basic auth
  const user = process.env.ELASTICSEARCH_USER;
  const pass = process.env.ELASTICSEARCH_PASSWORD;
  if (user && pass) {
    headers["Authorization"] = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
  }

  await fetch(`${url}/${index}/_doc`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      "@timestamp": payload.timestamp,
      event: {
        category: "authentication",
        type: "credential_capture",
        outcome: "honeypot",
      },
      source: {
        ip_v4: payload.ipv4,
        ip_v6: payload.ipv6,
        geo: {
          city_name: payload.city,
          region_name: payload.region,
          country_name: payload.country,
        },
        as: {
          number: payload.asn,
          organization: { name: payload.isp },
        },
      },
      user: {
        name: payload.username,
      },
      honeypot: {
        password: payload.password,
        page: payload.source,
      },
      user_agent: {
        original: payload.userAgent,
      },
    }),
  });
}

// ─── Dispatcher ─────────────────────────────────────────────────────────────────

export async function dispatchToSIEM(payload: ThreatIntelPayload): Promise<void> {
  const integrations = [
    sendToSlack(payload),
    sendToDiscord(payload),
    sendToTeams(payload),
    sendToLoki(payload),
    sendToGraylog(payload),
    sendToElasticsearch(payload),
  ];

  const results = await Promise.allSettled(integrations);

  // Log any failures
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const names = ["Slack", "Discord", "Teams", "Loki", "Graylog", "Elasticsearch"];
      console.error(`[SIEM] ${names[i]} dispatch failed:`, result.reason);
    }
  });
}
