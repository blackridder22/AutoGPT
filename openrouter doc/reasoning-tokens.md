# Reasoning Tokens

> Learn how to use reasoning tokens to enhance AI model outputs. Implement step-by-step reasoning traces for better decision making and transparency.

For models that support it, the OpenRouter API can return **Reasoning Tokens**, also known as thinking tokens. OpenRouter normalizes the different ways of customizing the amount of reasoning tokens that the model will use, providing a unified interface across different providers.

Reasoning tokens provide a transparent look into the reasoning steps taken by a model. Reasoning tokens are considered output tokens and charged accordingly.

Reasoning tokens are included in the response by default if the model decides to output them. Reasoning tokens will appear in the `reasoning` field of each message, unless you decide to exclude them.

<Note title="Some reasoning models do not return their reasoning tokens">
  While most models and providers make reasoning tokens available in the
  response, some (like the OpenAI o-series and Gemini Flash Thinking) do not.
</Note>

## Controlling Reasoning Tokens

You can control reasoning tokens in your requests using the `reasoning` parameter:

```json
{
  "model": "your-model",
  "messages": [],
  "reasoning": {
    // One of the following (not both):
    "effort": "high", // Can be "high", "medium", or "low" (OpenAI-style)
    "max_tokens": 2000, // Specific token limit (Anthropic-style)

    // Optional: Default is false. All models support this.
    "exclude": false // Set to true to exclude reasoning tokens from response
  }
}
```

The `reasoning` config object consolidates settings for controlling reasoning strength across different models. See the Note for each option below to see which models are supported and how other models will behave.

### Max Tokens for Reasoning

<Note title="Supported models">
  Currently supported by Anthropic and Gemini thinking models
</Note>

For models that support reasoning token allocation, you can control it like this:

* `"max_tokens": 2000` - Directly specifies the maximum number of tokens to use for reasoning

For models that only support `reasoning.effort` (see below), the `max_tokens` value will be used to determine the effort level.

### Reasoning Effort Level

<Note title="Supported models">
  Currently supported by the OpenAI o-series
</Note>

* `"effort": "high"` - Allocates a large portion of tokens for reasoning (approximately 80% of max\_tokens)
* `"effort": "medium"` - Allocates a moderate portion of tokens (approximately 50% of max\_tokens)
* `"effort": "low"` - Allocates a smaller portion of tokens (approximately 20% of max\_tokens)

For models that only support `reasoning.max_tokens`, the effort level will be set based on the percentages above.

### Excluding Reasoning Tokens

If you want the model to use reasoning internally but not include it in the response:

* `"exclude": true` - The model will still use reasoning, but it won't be returned in the response

Reasoning tokens will appear in the `reasoning` field of each message.

## Legacy Parameters

For backward compatibility, OpenRouter still supports the following legacy parameters:

* `include_reasoning: true` - Equivalent to `reasoning: {}`
* `include_reasoning: false` - Equivalent to `reasoning: { exclude: true }`

However, we recommend using the new unified `reasoning` parameter for better control and future compatibility.

## Examples

### Basic Usage with Reasoning Tokens

<Template
  data={{
  API_KEY_REF,
  MODEL: "openai/o3-mini"
}}
>
  <CodeGroup>
    ```python Python
    import requests
    import json

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {{API_KEY_REF}}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "{{MODEL}}",
        "messages": [
            {"role": "user", "content": "How would you build the world's tallest skyscraper?"}
        ],
        "reasoning": {
            "effort": "high"  # Use high reasoning effort
        }
    }

    response = requests.post(url, headers=headers, data=json.dumps(payload))
    print(response.json()['choices'][0]['message']['reasoning'])
    ```

    ```typescript TypeScript
    import OpenAI from 'openai';

    const openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: '{{API_KEY_REF}}',
    });

    async function getResponseWithReasoning() {
      const response = await openai.chat.completions.create({
        model: '{{MODEL}}',
        messages: [
          {
            role: 'user',
            content: "How would you build the world's tallest skyscraper?",
          },
        ],
        reasoning: {
          effort: 'high', // Use high reasoning effort
        },
      });

      console.log('REASONING:', response.choices[0].message.reasoning);
      console.log('CONTENT:', response.choices[0].message.content);
    }

    getResponseWithReasoning();
    ```
  </CodeGroup>
</Template>

### Using Max Tokens for Reasoning

For models that support direct token allocation (like Anthropic models), you can specify the exact number of tokens to use for reasoning:

<Template
  data={{
  API_KEY_REF,
  MODEL: "anthropic/claude-3.7-sonnet"
}}
>
  <CodeGroup>
    ```python Python
    import requests
    import json

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {{API_KEY_REF}}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "{{MODEL}}",
        "messages": [
            {"role": "user", "content": "What's the most efficient algorithm for sorting a large dataset?"}
        ],
        "reasoning": {
            "max_tokens": 2000  # Allocate 2000 tokens (or approximate effort) for reasoning
        }
    }

    response = requests.post(url, headers=headers, data=json.dumps(payload))
    print(response.json()['choices'][0]['message']['reasoning'])
    print(response.json()['choices'][0]['message']['content'])
    ```

    ```typescript TypeScript
    import OpenAI from 'openai';

    const openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: '{{API_KEY_REF}}',
    });

    async function getResponseWithReasoning() {
      const response = await openai.chat.completions.create({
        model: '{{MODEL}}',
        messages: [
          {
            role: 'user',
            content: "How would you build the world's tallest skyscraper?",
          },
        ],
        reasoning: {
          max_tokens: 2000, // Allocate 2000 tokens (or approximate effort) for reasoning
        },
      });

      console.log('REASONING:', response.choices[0].message.reasoning);
      console.log('CONTENT:', response.choices[0].message.content);
    }

    getResponseWithReasoning();
    ```
  </CodeGroup>
</Template>

### Excluding Reasoning Tokens from Response

If you want the model to use reasoning internally but not include it in the response:

<Template
  data={{
  API_KEY_REF,
  MODEL: "deepseek/deepseek-r1"
}}
>
  <CodeGroup>
    ```python Python
    import requests
    import json

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {{API_KEY_REF}}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "{{MODEL}}",
        "messages": [
            {"role": "user", "content": "Explain quantum computing in simple terms."}
        ],
        "reasoning": {
            "effort": "high",
            "exclude": true  # Use reasoning but don't include it in the response
        }
    }

    response = requests.post(url, headers=headers, data=json.dumps(payload))
    # No reasoning field in the response
    print(response.json()['choices'][0]['message']['content'])
    ```

    ```typescript TypeScript
    import OpenAI from 'openai';

    const openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: '{{API_KEY_REF}}',
    });

    async function getResponseWithReasoning() {
      const response = await openai.chat.completions.create({
        model: '{{MODEL}}',
        messages: [
          {
            role: 'user',
            content: "How would you build the world's tallest skyscraper?",
          },
        ],
        reasoning: {
          effort: 'high',
          exclude: true, // Use reasoning but don't include it in the response
        },
      });

      console.log('REASONING:', response.choices[0].message.reasoning);
      console.log('CONTENT:', response.choices[0].message.content);
    }

    getResponseWithReasoning();
    ```
  </CodeGroup>
</Template>

### Advanced Usage: Reasoning Chain-of-Thought

This example shows how to use reasoning tokens in a more complex workflow. It injects one model's reasoning into another model to improve its response quality:

<Template
  data={{
  API_KEY_REF,
}}
>
  <CodeGroup>
    ```python Python
    import requests
    import json

    question = "Which is bigger: 9.11 or 9.9?"

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {{API_KEY_REF}}",
        "Content-Type": "application/json"
    }

    def do_req(model, content, reasoning_config=None):
        payload = {
            "model": model,
            "messages": [
                {"role": "user", "content": content}
            ],
            "stop": "</think>"
        }

        return requests.post(url, headers=headers, data=json.dumps(payload))

    # Get reasoning from a capable model
    content = f"{question} Please think this through, but don't output an answer"
    reasoning_response = do_req("deepseek/deepseek-r1", content)
    reasoning = reasoning_response.json()['choices'][0]['message']['reasoning']

    # Let's test! Here's the naive response:
    simple_response = do_req("openai/gpt-4o-mini", question)
    print(simple_response.json()['choices'][0]['message']['content'])

    # Here's the response with the reasoning token injected:
    content = f"{question}. Here is some context to help you: {reasoning}"
    smart_response = do_req("openai/gpt-4o-mini", content)
    print(smart_response.json()['choices'][0]['message']['content'])
    ```

    ```typescript TypeScript
    import OpenAI from 'openai';

    const openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
    });

    async function doReq(model, content, reasoningConfig) {
      const payload = {
        model,
        messages: [{ role: 'user', content }],
        stop: '</think>',
        ...reasoningConfig,
      };

      return openai.chat.completions.create(payload);
    }

    async function getResponseWithReasoning() {
      const question = 'Which is bigger: 9.11 or 9.9?';
      const reasoningResponse = await doReq(
        'deepseek/deepseek-r1',
        `${question} Please think this through, but don't output an answer`,
      );
      const reasoning = reasoningResponse.choices[0].message.reasoning;

      // Let's test! Here's the naive response:
      const simpleResponse = await doReq('openai/gpt-4o-mini', question);
      console.log(simpleResponse.choices[0].message.content);

      // Here's the response with the reasoning token injected:
      const content = `${question}. Here is some context to help you: ${reasoning}`;
      const smartResponse = await doReq('openai/gpt-4o-mini', content);
      console.log(smartResponse.choices[0].message.content);
    }

    getResponseWithReasoning();
    ```
  </CodeGroup>
</Template>

## Provider-Specific Reasoning Implementation

### Anthropic Models with Reasoning Tokens

The latest Claude models, such as [anthropic/claude-3.7-sonnet](https://openrouter.ai/anthropic/claude-3.7-sonnet), support working with and returning reasoning tokens.

You can enable reasoning on Anthropic models in two ways:

1. Using the `:thinking` variant suffix (e.g., `anthropic/claude-3.7-sonnet:thinking`). The thinking variant defaults to high effort.
2. Using the unified `reasoning` parameter with either `effort` or `max_tokens`

#### Reasoning Max Tokens for Anthropic Models

When using Anthropic models with reasoning:

* When using the `reasoning.max_tokens` parameter, that value is used directly with a minimum of 1024 tokens.
* When using the `:thinking` variant suffix or the `reasoning.effort` parameter, the budget\_tokens are calculated based on the `max_tokens` value.

The reasoning token allocation is capped at 32,000 tokens maximum and 1024 tokens minimum. The formula for calculating the budget\_tokens is: `budget_tokens = max(min(max_tokens * {effort_ratio}, 32000), 1024)`

effort\_ratio is 0.8 for high effort, 0.5 for medium effort, and 0.2 for low effort.

**Important**: `max_tokens` must be strictly higher than the reasoning budget to ensure there are tokens available for the final response after thinking.

<Note title="Token Usage and Billing">
  Please note that reasoning tokens are counted as output tokens for billing
  purposes. Using reasoning tokens will increase your token usage but can
  significantly improve the quality of model responses.
</Note>

### Examples with Anthropic Models

#### Example 1: Streaming mode with reasoning tokens

<Template
  data={{
  API_KEY_REF,
  MODEL: "anthropic/claude-3.7-sonnet"
}}
>
  <CodeGroup>
    ```python Python
    from openai import OpenAI

    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key="{{API_KEY_REF}}",
    )

    def chat_completion_with_reasoning(messages):
        response = client.chat.completions.create(
            model="{{MODEL}}",
            messages=messages,
            max_tokens=10000,
            reasoning={
                "max_tokens": 8000  # Directly specify reasoning token budget
            },
            stream=True
        )
        return response

    for chunk in chat_completion_with_reasoning([
        {"role": "user", "content": "What's bigger, 9.9 or 9.11?"}
    ]):
        if hasattr(chunk.choices[0].delta, 'reasoning') and chunk.choices[0].delta.reasoning:
            print(f"REASONING: {chunk.choices[0].delta.reasoning}")
        elif chunk.choices[0].delta.content:
            print(f"CONTENT: {chunk.choices[0].delta.content}")
    ```

    ```typescript TypeScript
    import OpenAI from 'openai';

    const openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
    });

    async function chatCompletionWithReasoning(messages) {
      const response = await openai.chat.completions.create({
        model: '{{MODEL}}',
        messages,
        maxTokens: 10000,
        reasoning: {
          maxTokens: 8000, // Directly specify reasoning token budget
        },
        stream: true,
      });

      return response;
    }

    (async () => {
      for await (const chunk of chatCompletionWithReasoning([
        { role: 'user', content: "What's bigger, 9.9 or 9.11?" },
      ])) {
        if (chunk.choices[0].delta.reasoning) {
          console.log(`REASONING: ${chunk.choices[0].delta.reasoning}`);
        } else if (chunk.choices[0].delta.content) {
          console.log(`CONTENT: ${chunk.choices[0].delta.content}`);
        }
      }
    })();
    ```
  </CodeGroup>
</Template>