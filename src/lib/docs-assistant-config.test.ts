import { describe, expect, it } from "bun:test";
import { parseDocsAssistantConfig } from "./docs-assistant-config";

describe("documentation assistant configuration", () => {
  it("enables only an explicit preview with a valid HTTPS destination", () => {
    expect(
      parseDocsAssistantConfig({
        enabled: "true",
        gateway: "https://assistant.example.test",
      }),
    ).toEqual({ enabled: true, gateway: "https://assistant.example.test" });
  });

  it("accepts loopback HTTP for local development", () => {
    for (const gateway of ["http://localhost:8080", "http://127.0.0.1:8080"])
      expect(parseDocsAssistantConfig({ enabled: "true", gateway })).toEqual({
        enabled: true,
        gateway,
      });
  });

  it("keeps missing, false and noncanonical enablement values disabled", () => {
    for (const enabled of [undefined, "false", "", "1", "yes", "TRUE", true])
      expect(
        parseDocsAssistantConfig({
          enabled,
          gateway: "https://assistant.example.test",
        }),
      ).toEqual({ enabled: false });
  });

  it("fails closed on enabled but missing, malformed or disallowed destinations", () => {
    for (const gateway of [
      undefined,
      "",
      "not a URL",
      "http://remote.example.test",
      "ftp://assistant.example.test",
      42,
    ])
      expect(parseDocsAssistantConfig({ enabled: "true", gateway })).toEqual({
        enabled: false,
      });
  });

  it("does not require a usable destination when the preview is disabled", () => {
    expect(
      parseDocsAssistantConfig({ enabled: "false", gateway: "not a URL" }),
    ).toEqual({ enabled: false });
  });
});
