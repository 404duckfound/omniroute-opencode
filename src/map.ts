// Pure mapping: OmniRoute model object -> OpenCode Model.Info (or undefined to skip).

const MODALITIES = new Set(["text", "image", "audio", "video", "pdf"]);

export function mapModel(m: any, providerID = "omniroute"): any | undefined {
  const type = m.type;
  if (type !== undefined && type !== "chat") return undefined;
  if (m.status === "deprecated") return undefined;


  if (Array.isArray(m.output_modalities) && !m.output_modalities.includes("text")) return undefined;

  const context = m.context_length ?? m.max_input_tokens;
  if (!context) return undefined;

  const limit: any = { context };

  if (m.max_input_tokens && m.max_input_tokens < context) {
    limit.input = m.max_input_tokens;
  }

  let output = m.max_output_tokens;
  if (!output) {
    output = Math.min(32768, Math.floor(context / 4));
  } else if (output >= context) {
    output = 32768;
  }
  limit.output = output;

  const caps = m.capabilities || {};
  const inputMods = (m.input_modalities || ["text"]).filter((x: string) => MODALITIES.has(x));
  const outputMods = (m.output_modalities || ["text"]).filter((x: string) => MODALITIES.has(x));

  const capabilities: any = {
    tools: caps.tool_calling === true,
    input: inputMods,
    output: outputMods,
  };
  if (caps.temperature !== undefined) capabilities.temperature = caps.temperature;

  const compatibility: any = {};
  if (caps.reasoning || caps.thinking || caps.supportsThinking) {
    compatibility.reasoningField = "reasoning_content";
  }

  const effortTiers = Array.isArray(caps.effort_tiers) ? caps.effort_tiers : [];
  const variants = effortTiers.map((t: string) => ({ id: t, settings: { reasoningEffort: t } }));

  const cost: any = m.pricing
    ? [
        {
          input: m.pricing.input ?? 0,
          output: m.pricing.output ?? 0,
          cache: {
            read: m.pricing.cached ?? 0,
            write: m.pricing.cache_creation ?? 0,
          },
        },
      ]
    : [];

  const pkg =
    m.api_format === "responses"
      ? "@opencode/ai/providers/openai-compatible/responses"
      : undefined;

  return {
    id: m.id,
    modelID: m.id,
    providerID,
    name: m.id,
    family: m.family,
    enabled: true,
    status: "active",
    variants,
    package: pkg,
    capabilities,
    compatibility: Object.keys(compatibility).length ? compatibility : undefined,
    limit,
    cost,
    time: { released: m.release_date ? Date.parse(m.release_date) || 0 : 0 },
  };
}