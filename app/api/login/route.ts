import { NextRequest, NextResponse } from "next/server";
import { dispatchToSIEM, ThreatIntelPayload } from "@/lib/siem";

/**
 * IP Geolocation response from ip-api.com
 */
interface GeoResponse {
  status: string;
  city?: string;
  regionName?: string;
  country?: string;
  as?: string;
  isp?: string;
}

/**
 * Extract the client IP address from request headers.
 * Returns both IPv4 and IPv6 when available.
 */
function extractIPs(request: NextRequest): { ipv4: string | null; ipv6: string | null } {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  let ipv4: string | null = null;
  let ipv6: string | null = null;

  // x-forwarded-for may have multiple IPs: "client, proxy1, proxy2"
  const candidates: string[] = [];
  if (forwarded) {
    candidates.push(...forwarded.split(",").map((ip) => ip.trim()));
  }
  if (realIp) {
    candidates.push(realIp.trim());
  }

  // Fallback to request.ip (Next.js built-in)
  const nextIp = request.headers.get("x-forwarded-for") || "127.0.0.1";
  if (!candidates.length) {
    candidates.push(nextIp);
  }

  for (const ip of candidates) {
    if (ip.includes(":")) {
      // IPv6
      if (!ipv6) ipv6 = ip;
    } else {
      // IPv4
      if (!ipv4) ipv4 = ip;
    }
  }

  return { ipv4, ipv6 };
}

/**
 * Look up geolocation and ISP/ASN data for an IP address.
 */
async function geolocate(ip: string | null): Promise<{
  city: string | null;
  region: string | null;
  country: string | null;
  asn: string | null;
  isp: string | null;
}> {
  if (!ip || ip === "127.0.0.1" || ip === "::1") {
    return { city: null, region: null, country: null, asn: null, isp: null };
  }

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,country,as,isp`, {
      signal: AbortSignal.timeout(5000),
    });
    const data: GeoResponse = await res.json();

    if (data.status === "success") {
      return {
        city: data.city || null,
        region: data.regionName || null,
        country: data.country || null,
        asn: data.as || null,
        isp: data.isp || null,
      };
    }
  } catch (err) {
    console.error("[Geo] Lookup failed:", err);
  }

  return { city: null, region: null, country: null, asn: null, isp: null };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    // Extract IPs
    const { ipv4, ipv6 } = extractIPs(request);

    // Geolocation lookup (prefer IPv4 for geo, fallback to IPv6)
    const lookupIp = ipv4 || ipv6;
    const geo = await geolocate(lookupIp);

    // User agent
    const userAgent = request.headers.get("user-agent") || "Unknown";

    // Build the threat intel payload
    const payload: ThreatIntelPayload = {
      timestamp: new Date().toISOString(),
      username,
      password,
      ipv4,
      ipv6,
      city: geo.city,
      region: geo.region,
      country: geo.country,
      asn: geo.asn,
      isp: geo.isp,
      userAgent,
      source: "/wp-login.php",
    };

    // Log to server console
    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║  🍯 HONEYPOT — CREDENTIAL CAPTURE                          ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║  Timestamp : ${payload.timestamp}`);
    console.log(`║  Username  : ${payload.username}`);
    console.log(`║  Password  : ${payload.password}`);
    console.log(`║  IPv4      : ${payload.ipv4 || "N/A"}`);
    console.log(`║  IPv6      : ${payload.ipv6 || "N/A"}`);
    console.log(`║  Location  : ${[payload.city, payload.region, payload.country].filter(Boolean).join(", ") || "N/A"}`);
    console.log(`║  ISP       : ${payload.isp || "N/A"}`);
    console.log(`║  ASN       : ${payload.asn || "N/A"}`);
    console.log(`║  UA        : ${payload.userAgent}`);
    console.log("╚══════════════════════════════════════════════════════════════╝\n");

    // Dispatch to all configured SIEM integrations
    await dispatchToSIEM(payload);

    // Return a realistic WordPress error response
    return NextResponse.json(
      {
        error: "The username or password you entered is incorrect.",
        code: "invalid_credentials",
      },
      { status: 401 }
    );
  } catch (err) {
    console.error("[API] Login handler error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
