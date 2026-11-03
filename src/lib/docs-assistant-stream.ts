import {
  AssistantEventType,
  parseEvent,
  type AssistantEvent,
} from "./docs-assistant";

function frameEvent(frame: string): AssistantEvent | null {
  const lines = frame
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).replace(/^ /, ""));
  if (!lines.length) return null;
  const value: unknown = JSON.parse(lines.join("\n"));
  return parseEvent(value);
}

export async function readEvents(
  response: Response,
  receive: (event: AssistantEvent) => void,
): Promise<void> {
  if (!response.body) throw new Error("Assistant response has no stream");
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffered = "";
  let terminal = false;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffered += decoder.decode(chunk.value, { stream: true });
      if (buffered.length > 1_048_576)
        throw new Error("Assistant event exceeded its limit");
      buffered = buffered.replace(/\r\n/g, "\n");
      let boundary = buffered.indexOf("\n\n");
      while (boundary !== -1) {
        const event = frameEvent(buffered.slice(0, boundary));
        buffered = buffered.slice(boundary + 2);
        if (event) {
          if (terminal)
            throw new Error("Assistant sent events after completion");
          terminal =
            event.type === AssistantEventType.Completed ||
            event.type === AssistantEventType.Failed;
          receive(event);
        }
        boundary = buffered.indexOf("\n\n");
      }
    }
    buffered += decoder.decode();
    if (!terminal || buffered.trim())
      throw new Error("Assistant response was interrupted");
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
}
