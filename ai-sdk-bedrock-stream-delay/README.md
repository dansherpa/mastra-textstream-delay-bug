# AI SDK Bedrock Stream Delay Bug Reproduction

## Problem Statement

The Vercel AI SDK's `streamText` function exhibits a **3+ second delay** between receiving the last text chunk and the stream closing, specifically when using AWS Bedrock (Claude) as the model provider.

This delay occurs **upstream of Mastra** - it's inherent to the AI SDK's handling of Bedrock streaming responses.

## Impact

This delay causes poor user experience in streaming chat applications:
- Loading indicators remain visible for 3+ seconds after the response is complete
- Users cannot interact with the UI while waiting for the stream to close
- The delay is consistent and reproducible across all streaming responses

## Reproduction

### Prerequisites

1. AWS credentials configured with access to Bedrock
2. Access to Claude models in Bedrock (e.g., `us.anthropic.claude-haiku-4-5-20251001-v1:0`)

### Setup

```bash
cd bug-reproductions/ai-sdk-bedrock-stream-delay
npm install
```

### Run

```bash
# Set AWS credentials if not already configured
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key

# Run the reproduction
npm run reproduce
```

## Expected Behavior

The stream should close **immediately** (within ~100ms) after the last text chunk is received.

## Actual Behavior

The stream takes **3000-4000ms** to close after the last text chunk is received, even though:
- All text content has been delivered
- The `text-end` event has fired
- The `finish` event has fired

## Technical Details

### Key Observations

1. **Last text chunk arrives** at ~1500ms
2. **text-end event fires** at ~1520ms (20ms after last text)
3. **finish event fires** at ~1540ms (40ms after last text)
4. **Stream closes** at ~4500ms (**3000ms after last text!**)

### Root Cause

The delay occurs in the AI SDK's `fullStream` iterator when iterating through chunks from Bedrock. The iterator doesn't complete until several seconds after all events have been yielded.

This is likely related to how the AI SDK handles the underlying Bedrock stream closure.

## Example Output

```
=== AI SDK streamText with Bedrock (baseline) ===

Hello! How can I help you today?
[text-end event received at 1520ms]
[finish event received at 1540ms]

--- Timing Analysis ---
Last text-delta:  1500ms
text-end arrived: 1520ms (+20ms after last text)
finish arrived:   1540ms (+40ms after last text)
Stream closed:    4500ms

⚠️  Total delay after last text: 3000ms

=== Summary ===
Delay after last text chunk: 3000ms
❌ ISSUE CONFIRMED: 2+ second delay detected in AI SDK streamText
```

## Related Issues

- This is **not** a Mastra issue - Mastra simply wraps the AI SDK's `streamText`
- The delay is consistent across different Claude models on Bedrock
- The delay does **not** occur with OpenAI models (based on Mastra team's testing)

## Workarounds

Currently, there are no effective workarounds that eliminate the delay without introducing other issues:

1. ❌ **Client-side timeout** - Can cause premature completion during natural pauses
2. ❌ **Termination markers** - Still subject to the same iterator delay
3. ✅ **Accept the delay** - Most reliable approach, though not ideal for UX

## Environment

- Node.js: v20+
- TypeScript: 5.3.3
- Vercel AI SDK: 3.4.33
- AWS Bedrock SDK: 1.0.10
- Model: us.anthropic.claude-haiku-4-5-20251001-v1:0
- Region: us-east-1

## Next Steps

This reproduction should be shared with:
1. **Vercel AI SDK team** - To investigate the Bedrock streaming delay
2. **AWS Bedrock team** - To determine if this is a Bedrock API issue

The issue may require fixes at the AI SDK level or potentially the Bedrock SDK level.
