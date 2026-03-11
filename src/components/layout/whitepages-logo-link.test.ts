import { describe, expect, mock, spyOn, test } from "bun:test";

mock.module("@/lib/amplitude", () => ({
  default: { track: mock() },
}));

const { default: amplitude } = await import("@/lib/amplitude");
const { trackHomepageLinkClick } = await import("./whitepages-logo-link");

describe("trackHomepageLinkClick", () => {
  test("tracks WPAPIDocsHomepageLinkClicked with source_page", () => {
    const spy = spyOn(amplitude, "track");
    const url = "https://api.whitepages.com/docs/documentation/getting-started";

    trackHomepageLinkClick(url);

    expect(spy).toHaveBeenCalledWith("WPAPIDocsHomepageLinkClicked", {
      source_page: url,
    });
  });

  test("passes the exact source_page URL provided", () => {
    const spy = spyOn(amplitude, "track");
    const url = "https://api.whitepages.com/docs/references";

    trackHomepageLinkClick(url);

    expect(spy).toHaveBeenCalledWith("WPAPIDocsHomepageLinkClicked", {
      source_page: url,
    });
  });
});
