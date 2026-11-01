// OmniRoute client: fetch /models, resolve credential.

export class OmniRouteError extends Error {}

export async function fetchModels(opts: {
  baseURL: string;
  apiKey: string;
  signal?: AbortSignal;
}): Promise<any[]> {
  const url = opts.baseURL.replace(/\/$/, "") + "/models";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  if (opts.signal) opts.signal.addEventListener("abort", () => controller.abort(), { once: true });

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${opts.apiKey}` },
      signal: controller.signal,
    });
    if (!res.ok) throw new OmniRouteError(`HTTP ${res.status}`);
    const json: any = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveApiKey(ctx: any): Promise<string | undefined> {
  try {
    const conn = ctx?.integration?.connection;
    if (!conn) return undefined;

    let connection = await conn.active("omniroute");
    if (!connection) {
      // Fall back to the first saved credential for the integration.
      const listed = await ctx.integration.list();
      const integrations = listed?.data ?? listed ?? [];
      const omniroute = integrations.find?.((i: any) => i.id === "omniroute");
      connection = omniroute?.connections?.[0];
    }
    if (!connection) return undefined;

    const resolved = await conn.resolve(connection);
    if (resolved?.type === "key") return resolved.key;
    return undefined;
  } catch {
    return undefined;
  }
}