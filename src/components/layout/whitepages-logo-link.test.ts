import { describe, expect, mock, spyOn, test } from "bun:test";

mock.module("@/lib/amplitude", () => ({
  default: { track: mock() },
}));

const { default: amplitude } = await import("@/lib/amplitude");
const { trackHeaderSiteLinkClick } = await import("./whitepages-logo-link");

describe("trackHeaderSiteLinkClick", () => {
  test("fires WPClickedHeaderSiteLink with LinkType: API", () => {
    const spy = spyOn(amplitude, "track");

    trackHeaderSiteLinkClick();

    expect(spy).toHaveBeenCalledWith("WPClickedHeaderSiteLink", {
      LinkType: "API",
    });
  });
});
