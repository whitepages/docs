import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { parseCatalog } from "../../src/lib/docs-assistant";
import { createGatewayFixture } from "./docs-assistant-gateway";
import {
  verifyHistory,
  verifyRecallFailures,
  verifyBlockedStorage,
} from "./docs-assistant-history";

const browserExecutable = process.argv[2] || undefined;
const logPrefix = join(tmpdir(), `docs-assistant-e2e-${crypto.randomUUID()}`);
const catalog = parseCatalog(
  await Bun.file("public/assistant-catalog.json").json(),
);
const document = catalog.find(
  (entry) => entry.page_url === "/docs/documentation/phone-search",
);
assert(document, "Published phone page must have canonical identity");
const reservation = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch: () => new Response(),
});
const sitePort = reservation.port;
reservation.stop(true);
const siteOrigin = `http://127.0.0.1:${sitePort}`;
const fixture = createGatewayFixture(siteOrigin, document);
const { turns } = fixture;

function startSite(enabled: boolean) {
  return Bun.spawn(
    [process.execPath, "run", "dev", "--port", String(sitePort)],
    {
      env: {
        ...process.env,
        NEXT_PUBLIC_DOCS_ASSISTANT_ENABLED: String(enabled),
        NEXT_PUBLIC_DOCS_ASSISTANT_URL: fixture.server.url.origin,
        NEXT_PUBLIC_AMPLITUDE_API_KEY: "",
      },
      stdout: Bun.file(`${logPrefix}-site-${enabled}.log`),
      stderr: Bun.file(`${logPrefix}-site-${enabled}-error.log`),
    },
  );
}
async function ready(url: string): Promise<void> {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return;
    } catch {}
    await Bun.sleep(100);
  }
  throw new Error(`Server not ready; logs: ${logPrefix}`);
}
async function until(check: () => Promise<boolean>): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await Bun.sleep(50);
  }
  throw new Error(`Browser condition failed; logs: ${logPrefix}`);
}
async function send(page: Page, question: string): Promise<void> {
  await page.getByTestId("docs-assistant-question").fill(question);
  await page.getByTestId("docs-assistant-send").click();
}
async function preview(page: Page, value: string | null): Promise<void> {
  await page.evaluate((value) => {
    const address = new URL(window.location.href);
    if (value === null) address.searchParams.delete("docChat");
    else address.searchParams.set("docChat", value);
    window.history.pushState(null, "", address);
  }, value);
}
let site = startSite(true);
let browser: Browser | undefined;
const expiry = setTimeout(() => {
  site.kill();
  fixture.server.stop(true);
}, 180_000);
try {
  await ready(`${siteOrigin}${document.page_url}`);
  browser = await chromium.launch({
    headless: true,
    executablePath: browserExecutable,
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  await page.route("**/*", (route) =>
    ["127.0.0.1", "localhost"].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  const runtimeErrors: Error[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error));
  const assistantRequests: string[] = [];
  page.on("request", (request) => {
    if (
      request.url().endsWith("/assistant-catalog.json") ||
      request.url().includes("/api/v1/docs-assistant/")
    )
      assistantRequests.push(request.url());
  });
  await page.goto(
    `${siteOrigin}${document.page_url}?ignored=do-not-forward#section`,
  );
  await page.getByTestId("cookie-consent-banner").waitFor();
  assert.equal(await page.getByTestId("docs-assistant-open").count(), 0);
  assert.equal(await page.getByTestId("docs-assistant-panel").count(), 0);
  assert.deepEqual(assistantRequests, []);
  const catalogLoaded = page.waitForResponse(
    (response) =>
      response.url().endsWith("/assistant-catalog.json") && response.ok(),
  );
  await preview(page, "1");
  await catalogLoaded;
  await page.evaluate(() =>
    localStorage.setItem("customer-api-key", "browser-only-secret-sentinel"),
  );
  assert.equal(await page.getByTestId("docs-assistant-panel").count(), 0);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.getByTestId("docs-assistant-open").click();
  assert.equal(await page.getByTestId("docs-assistant-open").count(), 1);
  assert.equal(
    await page.getByTestId("docs-assistant-open").getAttribute("aria-expanded"),
    "true",
  );
  await page.getByTestId("docs-assistant-welcome").waitFor();
  assert.equal(await page.getByTestId("docs-assistant-customer").count(), 0);
  assert.equal(await page.getByTestId("docs-assistant-assistant").count(), 0);
  const question = page.getByTestId("docs-assistant-question");
  assert(
    await question.evaluate(
      (element) => element === window.document.activeElement,
    ),
  );
  await page.screenshot({ path: `${logPrefix}-welcome-dark.png` });
  await page.emulateMedia({ colorScheme: "light" });
  await page.screenshot({ path: `${logPrefix}-welcome-light.png` });
  await question.fill("First line");
  await question.press("Shift+Enter");
  await question.pressSequentially("Second line");
  assert.equal(await question.inputValue(), "First line\nSecond line");
  assert.equal(turns.length, 0);
  await question.dispatchEvent("keydown", {
    key: "Enter",
    code: "Enter",
    isComposing: true,
  });
  assert.equal(turns.length, 0);
  await question.fill("What does this phone page support?");
  await question.press("Enter");
  await until(
    async () =>
      (
        await page.getByTestId("docs-assistant-assistant").last().textContent()
      )?.includes("Checking the published page.") ?? false,
  );
  assert(await page.getByTestId("docs-assistant-send").isDisabled());
  await until(
    async () =>
      (await page.getByTestId("docs-assistant-activity").textContent()) ===
      "Referencing documentation…",
  );
  await page.getByTestId("docs-assistant-open").click();
  assert.equal(await page.getByTestId("docs-assistant-panel").count(), 0);
  await page.getByTestId("docs-assistant-open").click();
  await until(async () => await question.isEnabled());
  assert.equal(turns.length, 1);
  assert.equal(await page.getByTestId("docs-assistant-welcome").count(), 0);
  assert.equal(turns[0].page.doc_id, document.id);
  assert(!turns[0].page.expected_page_url.includes("ignored="));
  assert(!JSON.stringify(turns).includes("docChat"));
  const link = page
    .getByTestId("docs-assistant-assistant")
    .last()
    .getByRole("link");
  assert.equal(await link.getAttribute("href"), document.page_url);
  await send(page, "How can I contact sales instead?");
  await until(async () => await question.isEnabled());
  assert.equal(turns[1].conversation_id, fixture.conversation);
  assert.equal(turns[0].browser_flow_id, turns[1].browser_flow_id);
  assert.notEqual(turns[0].request_id, turns[1].request_id);
  assert(!JSON.stringify(turns).includes("browser-only-secret-sentinel"));
  await question.press("Escape");
  assert.equal(await page.getByTestId("docs-assistant-panel").count(), 0);
  assert(
    await page
      .getByTestId("docs-assistant-open")
      .evaluate((element) => element === window.document.activeElement),
  );
  await page.getByTestId("docs-assistant-open").click();
  assert.equal(await page.getByTestId("docs-assistant-customer").count(), 2);
  await page.setViewportSize({ width: 390, height: 844 });
  const bounds = await page.getByTestId("docs-assistant-panel").boundingBox();
  const bubbleBounds = await page
    .getByTestId("docs-assistant-open")
    .boundingBox();
  const consentBounds = await page
    .getByTestId("cookie-consent-banner")
    .boundingBox();
  assert(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 390);
  assert(bubbleBounds && bounds.y + bounds.height < bubbleBounds.y);
  assert(
    consentBounds && bubbleBounds.y + bubbleBounds.height <= consentBounds.y,
  );
  assert(bounds.y >= 0);
  await page.screenshot({ path: `${logPrefix}-mobile.png` });
  const storageKey = await verifyHistory(page, until, {
    siteOrigin,
    gatewayOrigin: fixture.server.url.origin,
    conversation: fixture.conversation,
    turns,
    recalls: () => fixture.recalls.length,
  });
  assert(fixture.recalls.length >= 2);
  await page.getByTestId("docs-assistant-welcome").waitFor();
  await page.getByTestId("docs-assistant-starter-getting-started").click();
  await until(async () => await question.isEnabled());
  assert.equal(turns.at(-1)?.message, "How do I get started with the API?");
  assert.equal(await page.getByTestId("docs-assistant-customer").count(), 1);
  assert.equal(await page.getByTestId("docs-assistant-welcome").count(), 0);
  await verifyRecallFailures(page, until, {
    storageKey,
    conversation: fixture.latestConversation(),
    setStatus: fixture.setRecallStatus,
    recalls: () => fixture.recalls.length,
  });
  for (const value of [null, "", "0", "true"]) {
    await preview(page, value);
    await until(
      async () => (await page.getByTestId("docs-assistant-open").count()) === 0,
    );
    assert.equal(await page.getByTestId("docs-assistant-panel").count(), 0);
    await preview(page, "1");
    await page.getByTestId("docs-assistant-open").waitFor();
  }
  await verifyBlockedStorage(page, until);
  await send(page, "Simulate an unavailable assistant");
  await until(async () => await question.isEnabled());
  await page.getByTestId("docs-assistant-failure").waitFor();
  assert(
    (await page.getByTestId("docs-assistant-failure").textContent())?.includes(
      "could not complete",
    ),
  );
  site.kill();
  await site.exited;
  site = startSite(false);
  await ready(`${siteOrigin}${document.page_url}`);
  await page.goto(`${siteOrigin}${document.page_url}?docChat=1`);
  await page.getByTestId("cookie-consent-banner").waitFor();
  assert.equal(await page.getByTestId("docs-assistant-open").count(), 0);
  assert.deepEqual(runtimeErrors, []);
} finally {
  clearTimeout(expiry);
  await browser?.close();
  site.kill();
  fixture.server.stop(true);
  await site.exited;
}
