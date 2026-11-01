import { test, expect, mock } from "bun:test";
import { fetchModels, resolveApiKey, OmniRouteError } from "../src/omniroute";

test("fetchModels successfully returns models array", async () => {
  const origFetch = globalThis.fetch;
  globalThis.fetch = mock(async (url: any, init: any) => {
    expect(String(url)).toBe("http://localhost:20128/v1/models");
    expect(init?.headers?.Authorization).toBe("Bearer test-key");
    return new Response(JSON.stringify({ data: [{ id: "model-1" }, { id: "model-2" }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as any;

  try {
    const models = await fetchModels({ baseURL: "http://localhost:20128/v1", apiKey: "test-key" });
    expect(models.length).toBe(2);
    expect(models[0].id).toBe("model-1");
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("fetchModels throws OmniRouteError on HTTP failure", async () => {
  const origFetch = globalThis.fetch;
  globalThis.fetch = mock(async () => {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }) as any;

  try {
    let err: any;
    try {
      await fetchModels({ baseURL: "http://localhost:20128/v1", apiKey: "invalid" });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(OmniRouteError);
    expect(err.message).toBe("HTTP 401");
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("resolveApiKey resolves key from active connection", async () => {
  const ctx = {
    integration: {
      connection: {
        active: mock(async (id: string) => {
          expect(id).toBe("omniroute");
          return { id: "active-conn" };
        }),
        resolve: mock(async (conn: any) => {
          expect(conn.id).toBe("active-conn");
          return { type: "key", key: "sk-secret-active" };
        }),
      },
    },
  };

  const key = await resolveApiKey(ctx);
  expect(key).toBe("sk-secret-active");
});

test("resolveApiKey falls back to listed credentials if no active connection", async () => {
  const ctx = {
    integration: {
      connection: {
        active: mock(async () => undefined),
        resolve: mock(async (conn: any) => {
          expect(conn.id).toBe("fallback-conn");
          return { type: "key", key: "sk-secret-fallback" };
        }),
      },
      list: mock(async () => ({
        data: [
          {
            id: "omniroute",
            connections: [{ id: "fallback-conn" }],
          },
        ],
      })),
    },
  };

  const key = await resolveApiKey(ctx);
  expect(key).toBe("sk-secret-fallback");
});

test("resolveApiKey returns undefined if no connection or credentials exist", async () => {
  const ctx = {
    integration: {
      connection: {
        active: mock(async () => undefined),
        resolve: mock(async () => undefined),
      },
      list: mock(async () => ({ data: [] })),
    },
  };

  const key = await resolveApiKey(ctx);
  expect(key).toBeUndefined();
});