# pi-no-repeat

Breaks small loop-prone LLMs out of repeat loops. Always on, no commands.

Manual workflow this automates: model repeats itself → you interrupt its turn
with the user prompt `you got stuck in a loop there` → model recovers.

## Detection

- Listens to `message_end` for `role === "assistant"`.
- Fingerprint = `JSON.stringify(thinking blocks only)` (order-sensitive, exact bytes). Text and toolCall blocks are ignored; messages with no thinking blocks are skipped.
- If latest fingerprint is **byte-for-byte identical** to the last fingerprint → loop.
- Empty (`[]`) thoughts are ignored.
- `toolResult` messages don't reset the chain (A, tool, A-repeat is still a loop).
- Any `user` message resets the chain.

## Break

- `pi.sendUserMessage("you got stuck in a loop there", { deliverAs: "steer" })`
  when busy, plain `sendUserMessage` when idle.
- After firing, the chain is cleared so it takes two fresh identical
  thoughts to nudge again.

## Install

```bash
# one-shot
pi --extension /workspace/tmp/pi-no-repeat/index.ts

# or persistent local package
pi install /workspace/tmp/pi-no-repeat
```
