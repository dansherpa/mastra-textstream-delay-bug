import { streamText } from 'ai';
import { bedrock } from '@ai-sdk/amazon-bedrock';

/**
 * Bug Reproduction: Vercel AI SDK streamText delay with AWS Bedrock
 *
 * This demonstrates that the 3+ second delay after the last text chunk
 * is happening in the Vercel AI SDK's streamText, NOT in Mastra.
 *
 * Expected: Stream should close immediately after the last text chunk
 * Actual: Stream takes 3+ seconds to close after the last text chunk
 */
async function benchmarkAISDK() {
    console.log('\n=== AI SDK streamText with Bedrock (baseline) ===\n');
    const startTime = Date.now();

    const result = await streamText({
        model: bedrock('us.anthropic.claude-haiku-4-5-20251001-v1:0'),
        messages: [{ role: 'user', content: 'Say hello in 10 words or less' }],
    });

    let lastTextTime = startTime;
    let textEndTime = 0;
    let finishTime = 0;

    for await (const chunk of result.fullStream) {
        const now = Date.now();
        if (chunk.type === 'text-delta') {
            lastTextTime = now;
            if (chunk.textDelta) {
                process.stdout.write(chunk.textDelta);
            }
        } else if (chunk.type === 'text-end') {
            textEndTime = now;
            console.log(`\n[text-end event received at ${now - startTime}ms]`);
        } else if (chunk.type === 'finish') {
            finishTime = now;
            console.log(`[finish event received at ${now - startTime}ms]`);
        }
    }

    const endTime = Date.now();
    console.log(`\n\n--- Timing Analysis ---`);
    console.log(`Last text-delta:  ${lastTextTime - startTime}ms`);
    console.log(`text-end arrived: ${textEndTime - startTime}ms (+${textEndTime - lastTextTime}ms after last text)`);
    console.log(`finish arrived:   ${finishTime - startTime}ms (+${finishTime - lastTextTime}ms after last text)`);
    console.log(`Stream closed:    ${endTime - startTime}ms`);
    console.log(`\n⚠️  Total delay after last text: ${endTime - lastTextTime}ms`);

    return { lastTextTime, endTime, startTime, delay: endTime - lastTextTime };
}

// Run the benchmark
benchmarkAISDK()
    .then((result) => {
        console.log('\n=== Summary ===');
        console.log(`Delay after last text chunk: ${result.delay}ms`);
        if (result.delay > 2000) {
            console.log('❌ ISSUE CONFIRMED: 2+ second delay detected in AI SDK streamText');
        } else {
            console.log('✅ No significant delay detected');
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    });
