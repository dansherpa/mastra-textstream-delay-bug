/**
 * Minimal reproduction for Mastra textStream delay issue
 *
 * Issue: textStream iterator has 3+ second delay after last chunk
 *
 * Setup:
 * 1. npm install @mastra/core @ai-sdk/anthropic
 * 2. Set ANTHROPIC_API_KEY environment variable
 * 3. Run: npx tsx mastra-bug-reproduction.ts
 */

import { Agent } from '@mastra/core';
import { anthropic } from '@ai-sdk/anthropic';

// Create a simple agent
const agent = new Agent({
    name: 'test-agent',
    instructions: 'You are a helpful assistant. Keep responses brief.',
    model: anthropic('claude-3-5-sonnet-20241022'),
});

async function demonstrateDelay() {
    console.log('Starting stream...');
    const startTime = Date.now();

    try {
        const stream = await agent.stream([
            {
                role: 'user',
                content: 'Say hello in 10 words or less',
            },
        ]);

        let chunkCount = 0;
        let lastChunkTime = startTime;

        console.log('\n--- Streaming chunks ---');
        for await (const chunk of stream.textStream) {
            if (chunk) {
                chunkCount++;
                lastChunkTime = Date.now();
                const elapsed = lastChunkTime - startTime;
                console.log(`Chunk ${chunkCount} (${elapsed}ms): "${chunk}"`);
            }
        }

        const iteratorEndTime = Date.now();
        const totalTime = iteratorEndTime - startTime;
        const delayAfterLastChunk = iteratorEndTime - lastChunkTime;

        console.log('\n--- Results ---');
        console.log(`Total chunks: ${chunkCount}`);
        console.log(`Total time: ${totalTime}ms`);
        console.log(`Last chunk at: ${lastChunkTime - startTime}ms`);
        console.log(`Iterator closed at: ${totalTime}ms`);
        console.log(`❌ Delay after last chunk: ${delayAfterLastChunk}ms`);

        if (delayAfterLastChunk > 1000) {
            console.log('\n🐛 BUG CONFIRMED: Iterator took >1 second to close after last chunk');
            console.log('Expected: Iterator should close within ~100ms of last chunk');
            console.log(`Actual: Iterator took ${delayAfterLastChunk}ms to close`);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

demonstrateDelay();
