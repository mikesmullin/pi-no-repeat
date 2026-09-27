import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

/**
 * pi-no-repeat
 *
 * Small models get stuck in loops, repeating the exact same thought.
 * Always on. No commands.
 *
 * Detection: on message_end for role=assistant, fingerprint =
 * JSON.stringify(thinking blocks only). If latest === last (exact same
 * bytes), interrupt the turn with a user nudge.
 */

const NUDGE = "you got stuck in a loop there";

export default function (pi: ExtensionAPI) {
  let lastFingerprint: string | undefined;

  function reset() {
    lastFingerprint = undefined;
  }

  function nudge(ctx: ExtensionContext) {
    // Clear the chain so a single post-nudge repeat doesn't instantly
    // re-fire — it takes two fresh identical thoughts to nudge again.
    reset();
    ctx.ui.notify("Loop detected — nudging model", "warning");
    try {
      if (ctx.isIdle()) {
        pi.sendUserMessage(NUDGE);
      } else {
        pi.sendUserMessage(NUDGE, { deliverAs: "steer" });
      }
    } catch {
      try {
        pi.sendUserMessage(NUDGE);
      } catch {
        // leave it; next duplicate will retry
      }
    }
  }

  pi.on("session_start", async () => {
    reset();
  });

  pi.on("message_end", async (event, ctx) => {
    const msg = event.message as { role?: string; content?: unknown };

    // Any user input (including our own nudge once it lands) breaks the
    // chain. Tool results do NOT reset — A, tool, A-repeat is still a loop.
    if (msg.role === "user") {
      reset();
      return;
    }
    if (msg.role !== "assistant") return;
    if (msg.content == null) return;
    if (!Array.isArray(msg.content)) return;

    // Thinking blocks only — text and toolCall blocks are ignored.
    const thoughts = (msg.content as { type?: string }[]).filter(
      (b) => b?.type === "thinking",
    );
    if (thoughts.length === 0) return;

    const fp = JSON.stringify(thoughts);

    if (lastFingerprint !== undefined && fp === lastFingerprint) {
      nudge(ctx);
      return;
    }

    lastFingerprint = fp;
  });
}
