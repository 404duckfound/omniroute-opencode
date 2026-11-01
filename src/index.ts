import { Plugin, Provider } from "@opencode/plugin";
import { mapModel } from "./map";
import { fetchModels, resolveApiKey } from "./omniroute";

// Collapse OmniRoute's separate *-low/*-medium/... or *(low)/*(medium) variants into one model
// with a `variants` array, matching the V2 model shape.
export function collapseVariants(models: any[]): any[] {
  const grouped = new Map<string, any>();
  for (const m of models) {
    const match = String(m.id).match(/[- ](?:\((low|medium|high|xhigh|max|minimal|none)\)|(low|medium|high|xhigh|max|minimal|none))$/i);
    const base = match ? String(m.id).slice(0, match.index).trim() : String(m.id);
    if (!grouped.has(base)) {
      grouped.set(base, { ...m, id: base, modelID: base, name: base, variants: [...(m.variants || [])] });
    }
    const g = grouped.get(base)!;
    if (match) {
      const v = (match[1] || match[2]).toLowerCase();
      if (!g.variants.some((existing: any) => existing.id === v)) {
        g.variants.push({ id: v, settings: { reasoningEffort: v } });
      }
    }
  }
  return [...grouped.values()];
}

export default Plugin.define({
  id: "omniroute",
  async setup(ctx) {
    const baseURL = (ctx.options as any)?.baseURL ?? "http://localhost:20128/v1";
    const refreshIntervalMs = (ctx.options as any)?.refreshIntervalMs ?? 300000;
    const providerID = Provider.ID.make("omniroute");

    // Mutable source captured by the provider transform; refresh replaces it and reloads.
    const source: { models: any[] } = { models: [] };
    let apiKey: string | undefined;

    

    // 1. Last successful inventory from storage.
    try {
      const cached = (await ctx.storage.get("inventory")) as any;
      if (cached?.models) source.models = cached.models;
    } catch {}

    // 2. Resolve the OmniRoute credential.
    apiKey = await resolveApiKey(ctx);
    

    // 3. Register the provider once; later refreshes only replace captured models.
    await ctx.provider.transform((editor) => {
      editor.remove(providerID);
      editor.add({
        info: {
          ...Provider.Info.empty(providerID),
          name: "OmniRoute",
          activation: "enabled",
          package: "@opencode/ai/providers/openai-compatible",
          integrationID: "omniroute" as any,
          settings: { baseURL },
        },
        models: source.models,
      });
    });
    

    const controller = new AbortController();

    const refresh = async () => {
      if (!apiKey) apiKey = await resolveApiKey(ctx);
      if (!apiKey) {
        console.warn("omniroute: no api key; skipping refresh");
        
        return;
      }
      try {
        const data = await fetchModels({ baseURL, apiKey, signal: controller.signal });
        const models = data.map((m) => mapModel(m, providerID as any)).filter(Boolean);
        source.models = collapseVariants(models);
        try {
          await ctx.storage.set("inventory", { at: Date.now(), models });
        } catch {}
        await ctx.provider.reload();
        
      } catch (e) {
        console.warn("omniroute: refresh failed", e);
      }
    };

    // 4. Initial refresh runs in the background so setup never blocks on the network.
    void refresh().catch(() => {});

    // 5. Periodic refresh.
    const timer = setInterval(() => void refresh().catch(() => {}), refreshIntervalMs);

    // 6. React to credential/integration changes.
    void (async () => {
      try {
        for await (const event of ctx.event.subscribe({
          types: ["credential.updated", "credential.switched", "integration.updated"],
          signal: controller.signal,
        })) {
          const next = await resolveApiKey(ctx);
          if (next !== apiKey) {
            apiKey = next;
            void refresh().catch(() => {});
          }
          void event;
        }
      } catch {}
    })();

    // 7. Cleanup.
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  },
});
