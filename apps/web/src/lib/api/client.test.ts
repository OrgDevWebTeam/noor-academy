import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, errorKind } from "./client";

function respond(status: number, body?: unknown) {
  const response = new Response(body === undefined ? null : JSON.stringify(body), { status });
  return vi.fn().mockResolvedValue(response);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("errorKind", () => {
  it.each([
    [400, "invalid"],
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not-found"],
    [409, "conflict"],
    [423, "locked"],
    [429, "rate-limited"],
    [500, "server"],
    [503, "server"],
    [418, "invalid"],
  ] as const)("maps %i to %s", (status, kind) => {
    expect(errorKind(status)).toBe(kind);
  });
});

describe("apiRequest", () => {
  it("sends the bearer token and returns the JSON body", async () => {
    const fetchMock = respond(200, { children: [] });
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiRequest("/v1/children", { token: "test-token" });

    expect(result).toEqual({ ok: true, data: { children: [] } });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/v1/children");
    expect(init.headers).toEqual({ Authorization: "Bearer test-token" });
  });

  it("sends a JSON body on POST", async () => {
    const fetchMock = respond(201, { child: { id: "c1" } });
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/v1/children", { method: "POST", token: "t", body: { displayName: "A" } });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"displayName":"A"}');
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
  });

  it("accepts 204 No Content", async () => {
    vi.stubGlobal("fetch", respond(204));
    expect(await apiRequest("/v1/children/c1/pin", { method: "POST", token: "t" })).toEqual({
      ok: true,
      data: undefined,
    });
  });

  it("keeps the API error code", async () => {
    vi.stubGlobal("fetch", respond(401, { error: "invalid_pin" }));
    expect(await apiRequest("/v1/x", { token: "t" })).toEqual({
      ok: false,
      error: { kind: "unauthorized", status: 401, code: "invalid_pin" },
    });
  });

  it("reports a network failure without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    expect(await apiRequest("/v1/x", { token: "t" })).toEqual({
      ok: false,
      error: { kind: "network" },
    });
  });
});
