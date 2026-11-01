# omniroute-opencode

An OpenCode V2 plugin that dynamically registers OmniRoute's `/v1/models` inventory as the `omniroute` provider via `ctx.provider.transform`.

## Features

- **Dynamic discovery**: syncs models directly from OmniRoute's `/v1/models` endpoint, so no manual `opencode.json` model entries are needed.
- **Flexible credentials**: uses the OpenCode credential flow (`omniroute` integration) and falls back to saved credentials.
- **Clean variant trees**: model variations (`-low`, `(medium)`, etc.) are merged into a single model with variants.
- **Full capability mapping**: preserves context limit, tools, modalities, streaming, and pricing.
- **Background sync**: periodically polls for new or updated models.

## Architecture

```
omniroute-opencode/
├── src/
│   ├── index.ts      # Plugin lifecycle (Plugin.define from @opencode/plugin),
│   │                 # background periodic sync, credential/event listeners
│   ├── omniroute.ts  # HTTP client for /models with timeouts; resolves
│   │                 # credentials through ctx.integration
│   └── map.ts        # Pure mapping: OmniRoute raw models -> OpenCode V2 Model.Info
└── test/
    └── map.test.ts   # Offline unit tests using fixture data (bun test)
```

## Setup

1. **Run OmniRoute** at `http://localhost:20128` (or a custom URL).
2. **Connect your API key** in OpenCode: `/connect` → **OmniRoute**.
3. **Register the plugin** in `~/.config/opencode/opencode.json`:

   ```jsonc
   {
     "plugins": [
       "omniroute-opencode"
     ],
     "providers": {
       "omniroute": {
         "name": "OmniRoute",
         "package": "@opencode/ai/providers/openai-compatible",
         "settings": {
           "baseURL": "http://localhost:20128/v1"
         }
       }
     }
   }
   ```

4. **Restart OpenCode**:

   ```bash
   opencode service restart
   ```

## Configuration

Options can be passed when registering the plugin as an object in `opencode.json`:

```jsonc
{
  "plugins": [
    {
      "package": "/path/to/omniroute-opencode",
      "options": {
        "baseURL": "http://localhost:20128/v1",
        "refreshIntervalMs": 300000
      }
    }
  ]
}
```

| Option              | Type     | Default                      | Description                                           |
| ------------------- | -------- | ---------------------------- | ----------------------------------------------------- |
| `baseURL`           | `string` | `http://localhost:20128/v1`  | OmniRoute API base URL.                               |
| `refreshIntervalMs` | `number` | `300000` (5 minutes)         | Polling interval for new or updated models, in ms.    |

## Model Filtering & Normalization

### Excluded models

A model is skipped if any of the following is true:

- `type` is `image`, `embedding`, `audio`, `video`, or `rerank` (non-chat models)
- `status` is `"deprecated"`
- `output_modalities` does not include text
- it has no context window

### Normalization

- **Display names**: map strictly to the model ID (`m.id`) to avoid noisy UI labels.
- **Reasoning variants**: trailing tags such as `(low)`, `(medium)`, `-high`, plus `effort_tiers`, are merged into one model with matching `variants`.
- **Special protocols**: models with `api_format: "responses"` use `@opencode/ai/providers/openai-compatible/responses`.

## Development

Run the offline unit tests:

```bash
bun test
```