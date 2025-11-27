# Mastra textStream Delay Bug - Minimal Reproduction

## Issue Description

When using `Agent.stream()` with `textStream`, there is a significant delay (3+ seconds) between when the last chunk is yielded and when the async iterator completes.

### Expected Behavior
The `textStream` iterator should close within ~100ms after the last chunk is yielded.

### Actual Behavior
The iterator takes 3000-4000ms to close after the last chunk, causing downstream code to wait unnecessarily.

### Impact
This degrades user experience in streaming applications:
- User sees the complete response immediately (from chunks)
- UI remains in "loading" state for 3+ seconds
- Input fields stay disabled during this wait
- Application appears frozen/unresponsive

## Reproduction Steps

1. **Clone or copy this reproduction**
   ```bash
   # Create new directory
   mkdir mastra-textstream-bug
   cd mastra-textstream-bug

   # Copy the reproduction files
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set environment variables**
   ```bash
   export ANTHROPIC_API_KEY="your-key-here"
   # Or set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION for Bedrock
   ```

4. **Run the reproduction**
   ```bash
   npx tsx mastra-bug-reproduction.ts
   ```

## Expected Output

```
Starting stream...

--- Streaming chunks ---
Chunk 1 (234ms): "Hello"
Chunk 2 (456ms): "! "
Chunk 3 (678ms): "How can I help?"

--- Results ---
Total chunks: 3
Total time: 3912ms
Last chunk at: 678ms
Iterator closed at: 3912ms
❌ Delay after last chunk: 3234ms

🐛 BUG CONFIRMED: Iterator took >1 second to close after last chunk
Expected: Iterator should close within ~100ms of last chunk
Actual: Iterator took 3234ms to close
```

## Environment

- **Mastra version**: `@mastra/core` latest
- **AI SDK**: `@ai-sdk/anthropic` latest
- **Node version**: 20+
- **LLM Provider**: Anthropic Claude (also reproduces with AWS Bedrock)

## Technical Details

The delay occurs in the `for await (const chunk of stream.textStream)` loop. After the last chunk is yielded to the application code, the iterator's internal cleanup/finalization takes 3+ seconds before `done: true` is returned.

This appears to be waiting for some internal Promise or stream to close, but the delay is excessive for typical streaming use cases.

## Workaround

Currently no workaround exists that eliminates the delay. The only option is to:
1. Use `stream.text` instead (but this waits for ALL chunks, defeating the purpose of streaming)
2. Implement a timeout-based completion detection (unreliable and hacky)

## Related Code

The issue manifests in typical streaming patterns:

```typescript
const stream = await agent.stream(messages);

// User sees all chunks quickly
for await (const chunk of stream.textStream) {
  yield chunk; // Chunks arrive fast
}

// But iterator stays open for 3+ seconds here
// Finally exits and code continues...
```

This reproduction is extracted from a production Remix application where the delay causes visible UX issues (loading indicators don't disappear promptly).
