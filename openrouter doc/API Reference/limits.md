# Limits

> Learn about OpenRouter's API rate limits, credit-based quotas, and DDoS protection. Configure and monitor your model usage limits effectively.

<Tip>
  If you need a lot of inference, making additional accounts or API keys *makes
  no difference*. We manage the rate limit globally. We do however have
  different rate limits for different models, so you can share the load that way
  if you do run into issues. If you start getting rate limited -- [tell
  us](https://discord.gg/fVyRaUDgxW)! We are here to help. If you are able,
  don't specify providers; that will let us load balance it better.
</Tip>

## Rate Limits and Credits Remaining

To check the rate limit or credits left on an API key, make a GET request to `https://openrouter.ai/api/v1/auth/key`.

<Template data={{ API_KEY_REF }}>
  <CodeGroup>
    ```typescript title="TypeScript"
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer {{API_KEY_REF}}',
      },
    });
    ```

    ```python title="Python"
    import requests
    import json

    response = requests.get(
      url="https://openrouter.ai/api/v1/auth/key",
      headers={
        "Authorization": f"Bearer {{API_KEY_REF}}"
      }
    )

    print(json.dumps(response.json(), indent=2))
    ```
  </CodeGroup>
</Template>

If you submit a valid API key, you should get a response of the form:

```typescript title="TypeScript"
type Key = {
  data: {
    label: string;
    usage: number; // Number of credits used
    limit: number | null; // Credit limit for the key, or null if unlimited
    is_free_tier: boolean; // Whether the user has paid for credits before
    rate_limit: {
      requests: number; // Number of requests allowed...
      interval: string; // in this interval, e.g. "10s"
    };
  };
};
```

There are a few rate limits that apply to certain types of requests, regardless of account status:

1. Free usage limits: If you're using a free model variant (with an ID ending in <code>{sep}{Variant.Free}</code>), you can make up to {FREE_MODEL_RATE_LIMIT_RPM} requests per minute. The following per-day limits apply:

* If you have purchased less than {FREE_MODEL_CREDITS_THRESHOLD} credits, you're limited to {FREE_MODEL_NO_CREDITS_RPD} <code>{sep}{Variant.Free}</code> model requests per day.

* If you purchase at least {FREE_MODEL_CREDITS_THRESHOLD} credits, your daily limit is increased to {FREE_MODEL_HAS_CREDITS_RPD} <code>{sep}{Variant.Free}</code> model requests per day.

2. **DDoS protection**: Cloudflare's DDoS protection will block requests that dramatically exceed reasonable usage.

For all other requests, rate limits are a function of the number of credits remaining on the key or account. Partial credits round up in your favor. For the credits available on your API key, you can make **1 request per credit per second** up to the surge limit (typically 500 requests per second, but you can go higher).

For example:

* 0.5 credits â†’ 1 req/s (minimum)
* 5 credits â†’ 5 req/s
* 10 credits â†’ 10 req/s
* 500 credits â†’ 500 req/s
* 1000 credits â†’ Contact us if you see ratelimiting from OpenRouter

If your account has a negative credit balance, you may see <code>{HTTPStatus.S402_Payment_Required}</code> errors, including for free models. Adding credits to put your balance above zero allows you to use those models again.