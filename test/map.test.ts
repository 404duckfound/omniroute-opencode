import { test, expect } from "bun:test";
import { mapModel } from "../src/map";
import fixture from "./fixtures/models.sample.json";

test("maps basic chat model", () => {
  const m = (fixture as any[]).find((x) => x.id === "chat/basic");
  const out = mapModel(m);
  expect(out.modelID).toBe("chat/basic");
  expect(out.limit.input).toBe(6000);
  expect(out.limit.output).toBe(2048);
  expect(out.capabilities.tools).toBe(true);
  expect(out.cost[0].input).toBe(1);
  expect(out.package).toBeUndefined();
});

test("responses package", () => {
  const m = (fixture as any[]).find((x) => x.id === "codex/luna");
  const out = mapModel(m);
  expect(out.package).toBe("@opencode/ai/providers/openai-compatible/responses");
  expect(out.limit.output).toBe(16000);
});

test("no max_output_tokens fallback", () => {
  const m = (fixture as any[]).find((x) => x.id === "chat/nooutput");
  const out = mapModel(m);
  expect(out.limit.output).toBe(1024);
});

test("output >= context -> 32768", () => {
  const m = (fixture as any[]).find((x) => x.id === "chat/bigout");
  const out = mapModel(m);
  expect(out.limit.output).toBe(32768);
});

test("max_input < context", () => {
  const m = (fixture as any[]).find((x) => x.id === "chat/smallin");
  const out = mapModel(m);
  expect(out.limit.input).toBe(4096);
});

test("skips non-chat types", () => {
  for (const t of ["image", "embedding", "audio", "video", "rerank"]) {
    const m = (fixture as any[]).find((x) => x.type === t);
    expect(mapModel(m)).toBeUndefined();
  }
});

test("skips deprecated and no-context", () => {
  expect(mapModel((fixture as any[]).find((x) => x.id === "dep/model"))).toBeUndefined();
  expect(mapModel((fixture as any[]).find((x) => x.id === "noctx/model"))).toBeUndefined();
});

test("untyped allowed", () => {
  const m = (fixture as any[]).find((x) => x.id === "untyped");
  const out = mapModel(m);
  expect(out).toBeDefined();
});

test("priceless -> empty cost array", () => {
  const m = (fixture as any[]).find((x) => x.id === "priceless");
  const out = mapModel(m);
  expect(out.cost).toEqual([]);
});