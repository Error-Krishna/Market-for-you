import { describe, expect, it } from "vitest";
import { normalizeApiBaseUrl } from "@/app/config/env";

describe("Frontend Environment & API Base URL Normalization", () => {
  it("normalizes root backend URL by appending /api", () => {
    expect(normalizeApiBaseUrl("https://market-aura-api.onrender.com")).toBe(
      "https://market-aura-api.onrender.com/api",
    );
    expect(normalizeApiBaseUrl("https://market-aura-api.onrender.com/")).toBe(
      "https://market-aura-api.onrender.com/api",
    );
  });

  it("preserves URL that already ends in /api", () => {
    expect(normalizeApiBaseUrl("https://market-aura-api.onrender.com/api")).toBe(
      "https://market-aura-api.onrender.com/api",
    );
    expect(normalizeApiBaseUrl("https://market-aura-api.onrender.com/api/")).toBe(
      "https://market-aura-api.onrender.com/api",
    );
  });

  it("strips trailing /v1 when user provides full /api/v1 prefix", () => {
    expect(normalizeApiBaseUrl("https://market-aura-api.onrender.com/api/v1")).toBe(
      "https://market-aura-api.onrender.com/api",
    );
    expect(normalizeApiBaseUrl("https://market-aura-api.onrender.com/api/v1/")).toBe(
      "https://market-aura-api.onrender.com/api",
    );
  });

  it("handles local development localhost URLs cleanly", () => {
    expect(normalizeApiBaseUrl("http://localhost:8000")).toBe("http://localhost:8000/api");
    expect(normalizeApiBaseUrl("http://localhost:8000/api")).toBe("http://localhost:8000/api");
    expect(normalizeApiBaseUrl("http://localhost:8000/api/v1")).toBe("http://localhost:8000/api");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeApiBaseUrl("")).toBe("");
    expect(normalizeApiBaseUrl(undefined)).toBe("");
  });
});
