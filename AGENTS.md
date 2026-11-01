# omniroute-opencode

OpenCode V2 plugin package that registers OmniRoute's `/v1/models` inventory dynamically as the `omniroute` provider via `ctx.provider.transform`.

## Project Structure & Architecture

- **Runtime**: OpenCode V2 plugin (`@opencode/plugin`).
- **Entry point**: `src/index.ts` exporting `Plugin.define`.
- **Pure mapper**: `src/map.ts` converting raw OmniRoute objects to `Model.Info`.
- **Client**: `src/omniroute.ts` handling authenticated `/v1/models` requests and credential resolution via `ctx.integration`.
- **Testing**: `test/map.test.ts` with `test/fixtures/models.sample.json` (`bun test`).

## Conventions & Rules

- **Display Names**: Model names map strictly to model IDs (`m.id`).
- **Model Filtering**: Only chat models with valid text output and positive context length are mapped. Non-chat types (image, embedding, audio, video, rerank) and deprecated status models are excluded.
- **Reasoning & Variants**: `effort_tiers` and suffix variant tokens (`-low`, `(medium)`, etc.) collapse into a single base model with entries in `variants`.
