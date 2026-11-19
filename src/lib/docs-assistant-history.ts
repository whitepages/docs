import type { parseRecall, VisibleRecord } from "./docs-assistant";

const visibilityWindow = 30 * 24 * 60 * 60 * 1000;

export function conversationVisible(
  lastInteractionAt: number | null,
  now: number,
): boolean {
  return (
    lastInteractionAt === null || lastInteractionAt >= now - visibilityWindow
  );
}

export function latestInteractionTime(
  first: number | null,
  second: number | null,
): number | null {
  if (first === null) return second;
  if (second === null) return first;
  return Math.max(first, second);
}

export function latestRecordTime(
  records: readonly VisibleRecord[],
): number | null {
  return records.reduce<number | null>((latest, record) => {
    const time = Date.parse(record.created_at);
    return latestInteractionTime(latest, time);
  }, null);
}

export function visibleRecallRecords(
  recall: ReturnType<typeof parseRecall>,
  now: number,
): readonly VisibleRecord[] {
  return recall.records.filter((record) =>
    conversationVisible(Date.parse(record.created_at), now),
  );
}
