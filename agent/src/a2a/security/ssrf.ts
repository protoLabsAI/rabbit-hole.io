/**
 * SSRF guard for webhook URLs.
 *
 * Rejects URLs that resolve (by literal form) to loopback, RFC1918,
 * link-local, or multicast ranges — the usual SSRF primitives. An explicit
 * allowlist of hostnames lets trusted internal services (workstacean,
 * automaker-server) still register callbacks even though they live on
 * private Docker networks.
 *
 * This is a lexical check only; a full guard would also resolve DNS and
 * verify the resulting address. Spec calls out this as "optional SSRF
 * guard" — the lexical form catches the common mistake (devs copying a
 * dev-pod IP into prod configs) without requiring network calls at
 * registration time.
 */

const LOOPBACK_V6 = new Set(["::1", "0000:0000:0000:0000:0000:0000:0000:0001"]);

export interface SsrfValidatorConfig {
  /** Hostnames explicitly allowed even if they resolve to private ranges. */
  allowedHosts: string[];
  /** Schemes allowed. Default: http, https. */
  allowedSchemes?: string[];
}

export class SsrfError extends Error {
  constructor(
    message: string,
    public readonly url: string
  ) {
    super(message);
    this.name = "SsrfError";
  }
}

export class SsrfValidator {
  private readonly allowed: Set<string>;
  private readonly schemes: Set<string>;

  constructor(cfg: SsrfValidatorConfig) {
    this.allowed = new Set(cfg.allowedHosts.map((h) => h.toLowerCase()));
    this.schemes = new Set(
      (cfg.allowedSchemes ?? ["http:", "https:"]).map((s) => s.toLowerCase())
    );
  }

  /**
   * Throws SsrfError if the URL should be rejected, returns a parsed URL
   * otherwise.
   */
  validate(rawUrl: string): URL {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new SsrfError("Invalid URL", rawUrl);
    }

    if (!this.schemes.has(url.protocol)) {
      throw new SsrfError(`Scheme not allowed: ${url.protocol}`, rawUrl);
    }

    const host = url.hostname.toLowerCase();

    // Allowlist bypass — hostname matches an explicitly trusted internal
    // service. This is the intended escape for in-cluster webhooks like
    // http://workstacean:3000/api/a2a/callback/{taskId}.
    if (this.allowed.has(host)) return url;

    if (isLoopbackHostname(host)) {
      throw new SsrfError(`Loopback not allowed: ${host}`, rawUrl);
    }
    if (isPrivateIpLiteral(host)) {
      throw new SsrfError(`Private IP not allowed: ${host}`, rawUrl);
    }
    if (isLinkLocal(host)) {
      throw new SsrfError(`Link-local not allowed: ${host}`, rawUrl);
    }
    if (isMulticast(host)) {
      throw new SsrfError(`Multicast not allowed: ${host}`, rawUrl);
    }
    return url;
  }
}

// ── Range tests ─────────────────────────────────────────────────────

function isLoopbackHostname(host: string): boolean {
  if (host === "localhost") return true;
  if (host === "127.0.0.1") return true;
  // 127.0.0.0/8
  if (/^127\./.test(host) && isIpv4Literal(host)) return true;
  if (LOOPBACK_V6.has(host)) return true;
  return false;
}

function isPrivateIpLiteral(host: string): boolean {
  if (!isIpv4Literal(host)) {
    // IPv6 ULA fc00::/7
    if (/^f[cd][0-9a-f]{2}:/i.test(host)) return true;
    return false;
  }
  const octets = host.split(".").map(Number);
  const [a, b] = octets;
  if (a === undefined || b === undefined) return false;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  return false;
}

function isLinkLocal(host: string): boolean {
  if (isIpv4Literal(host)) {
    const [a, b] = host.split(".").map(Number);
    if (a === 169 && b === 254) return true; // 169.254.0.0/16
    return false;
  }
  // IPv6 link-local fe80::/10
  return /^fe[89ab][0-9a-f]?:/i.test(host);
}

function isMulticast(host: string): boolean {
  if (isIpv4Literal(host)) {
    const [a] = host.split(".").map(Number);
    if (a !== undefined && a >= 224 && a <= 239) return true; // 224.0.0.0/4
    return false;
  }
  // IPv6 multicast ff00::/8
  return /^ff[0-9a-f]{2}:/i.test(host);
}

function isIpv4Literal(host: string): boolean {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;
  return host.split(".").every((s) => {
    const n = Number(s);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}
