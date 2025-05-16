# Message Transforms

> Transform and optimize messages before sending them to AI models. Learn about middle-out compression and context window optimization with OpenRouter.

To help with prompts that exceed the maximum context size of a model, OpenRouter supports a custom parameter called `transforms`:

```typescript
{
  transforms: ["middle-out"], // Compress prompts that are > context size.
  messages: [...],
  model // Works with any model
}
```

This can be useful for situations where perfect recall is not required. The transform works by removing or truncating messages from the middle of the prompt, until the prompt fits within the model's context window.

In some cases, the issue is not the token context length, but the actual number of messages. The transform addresses this as well: For instance, Anthropic's Claude models enforce a maximum of {anthropicMaxMessagesCount} messages. When this limit is exceeded with middle-out enabled, the transform will keep half of the messages from the start and half from the end of the conversation.

When middle-out compression is enabled, OpenRouter will first try to find models whose context length is at least half of your total required tokens (input + completion). For example, if your prompt requires 10,000 tokens total, models with at least 5,000 context length will be considered. If no models meet this criteria, OpenRouter will fall back to using the model with the highest available context length.

The compression will then attempt to fit your content within the chosen model's context window by removing or truncating content from the middle of the prompt. If middle-out compression is disabled and your total tokens exceed the model's context length, the request will fail with an error message suggesting you either reduce the length or enable middle-out compression.

<Note>
  [All OpenRouter endpoints](/models) with 8k (8,192 tokens) or less context
  length will default to using `middle-out`. To disable this, set `transforms:   []` in the request body.
</Note>

The middle of the prompt is compressed because [LLMs pay less attention](https://arxiv.org/abs/2307.03172) to the middle of sequences.