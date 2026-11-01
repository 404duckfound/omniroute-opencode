import { test, expect } from "bun:test";
import { collapseVariants } from "../src/index";

test("collapseVariants collapses suffix tokens like -low, -medium, -high into variants", () => {
  const input = [
    { id: "claude-opus-4-6-thinking-low", variants: [] },
    { id: "claude-opus-4-6-thinking-medium", variants: [] },
    { id: "claude-opus-4-6-thinking-high", variants: [] },
  ];

  const collapsed = collapseVariants(input);
  expect(collapsed.length).toBe(1);
  expect(collapsed[0].id).toBe("claude-opus-4-6-thinking");
  expect(collapsed[0].name).toBe("claude-opus-4-6-thinking");
  expect(collapsed[0].variants.length).toBe(3);
  expect(collapsed[0].variants.map((v: any) => v.id)).toEqual(["low", "medium", "high"]);
  expect(collapsed[0].variants[0].settings).toEqual({ reasoningEffort: "low" });
});

test("collapseVariants collapses parenthesized variants like (low), (medium)", () => {
  const input = [
    { id: "gpt-6-luna (low)", variants: [] },
    { id: "gpt-6-luna (medium)", variants: [] },
    { id: "gpt-6-luna (high)", variants: [] },
  ];

  const collapsed = collapseVariants(input);
  expect(collapsed.length).toBe(1);
  expect(collapsed[0].id).toBe("gpt-6-luna");
  expect(collapsed[0].name).toBe("gpt-6-luna");
  expect(collapsed[0].variants.length).toBe(3);
  expect(collapsed[0].variants.map((v: any) => v.id)).toEqual(["low", "medium", "high"]);
});

test("collapseVariants preserves models without variants and pre-existing effort_tiers variants", () => {
  const input = [
    {
      id: "nemotron-3-ultra",
      variants: [{ id: "none", settings: { reasoningEffort: "none" } }],
    },
    {
      id: "normal-chat-model",
      variants: [],
    },
  ];

  const collapsed = collapseVariants(input);
  expect(collapsed.length).toBe(2);
  expect(collapsed[0].id).toBe("nemotron-3-ultra");
  expect(collapsed[0].variants.length).toBe(1);
  expect(collapsed[1].id).toBe("normal-chat-model");
  expect(collapsed[1].variants.length).toBe(0);
});