import { describe, expect, it } from "bun:test";
import { parseRecall } from "./docs-assistant";
import {
  conversationVisible,
  latestRecordTime,
  visibleRecallRecords,
} from "./docs-assistant-history";

const now = Date.parse("2026-11-19T12:00:00Z");
const day = 24 * 60 * 60 * 1000;
const cutoff = now - 30 * day;
const conversation = "a899c12d-3e77-4faa-8cce-79bf57761ccd";
const oldRecord = "ba40facf-b176-4ccf-b9d6-be994880e43d";
const boundaryRecord = "e2816505-e581-486d-b64e-16a03a10880e";

function recalledHistory() {
  return parseRecall({
    conversation_id: conversation,
    records: [
      {
        id: oldRecord,
        role: "customer",
        content: "Expired question",
        created_at: new Date(cutoff - 1).toISOString(),
      },
      {
        id: boundaryRecord,
        role: "assistant",
        content: "At the boundary",
        created_at: new Date(cutoff).toISOString(),
      },
    ],
    interrupted: false,
  });
}

describe("documentation history visibility", () => {
  it("uses event timestamps, not read-only recall time, at the 30-day boundary", () => {
    const recall = recalledHistory();
    const interaction = latestRecordTime(recall.records);
    expect(interaction).toBe(cutoff);
    expect(conversationVisible(interaction, now)).toBe(true);
    expect(conversationVisible(interaction, now + 1)).toBe(false);
    expect(latestRecordTime(recall.records)).toBe(cutoff);
  });

  it("omits expired content, preserves order and leaves retained model history unchanged", () => {
    const recall = recalledHistory();
    expect(visibleRecallRecords(recall, now).map(({ id }) => id)).toEqual([
      boundaryRecord,
    ]);
    expect(visibleRecallRecords(recall, now + 1)).toEqual([]);
    expect(recall.records.map(({ id }) => id)).toEqual([
      oldRecord,
      boundaryRecord,
    ]);
  });

  it("leaves unknown migration activity eligible for server recall rather than inventing time", () => {
    expect(latestRecordTime([])).toBeNull();
    expect(conversationVisible(null, now)).toBe(true);
    expect(conversationVisible(now - 7 * day, now)).toBe(true);
  });
});
