# Python Libraries I Reach For

A curated list of Python libraries worth defaulting to, grouped by purpose.
Pins and extras are written exactly as installed.

**Web & API**

- **[litestar-org/litestar](https://github.com/litestar-org/litestar)** — Fast, batteries-included ASGI web framework. DI, msgspec-based (de)serialization, OpenAPI out of the box. Preferred over FastAPI for larger apps.

**HTTP Clients**

- **[jawah/niquests](https://github.com/jawah/niquests)** — Drop-in `requests` replacement: same API, adds HTTP/2 & HTTP/3, async, connection multiplexing. Use instead of `requests`.

**Async**

- **[agronholm/anyio](https://github.com/agronholm/anyio)** — Async abstraction layer over asyncio/trio. Structured concurrency (task groups), portable primitives. The async foundation many modern libs build on.

**ML / Hugging Face Stack**

- **[huggingface/transformers](https://github.com/huggingface/transformers)** — Install as `transformers[kernels]` (the `kernels` extra pulls optimized fused kernels) instead of plain `transformers`.
- **[huggingface/accelerate](https://github.com/huggingface/accelerate)** — Device placement, mixed precision, and multi-GPU/distributed launch without boilerplate.
- **[huggingface/datasets](https://github.com/huggingface/datasets)** — Memory-mapped (Arrow) datasets, streaming, fast `map`/filter, hub integration.

**CLI & Config**

- **[omni-us/jsonargparse](https://github.com/omni-us/jsonargparse)** — Build CLIs/configs straight from type signatures; nested dataclass/class instantiation from YAML. The engine behind Lightning CLI. Install as `jsonargparse[signatures]>=4.27` (the `[signatures]` extra enables signature introspection).

**Serialization & Validation**

- **[jcrist/msgspec](https://github.com/jcrist/msgspec)** — Extremely fast serialization + validation. `Struct` types with type-checked decoding for JSON and MessagePack; far faster than pydantic for pure (de)serialization. Used internally by litestar.

**Media**

- **[open-world-agents/mediaref](https://github.com/open-world-agents/mediaref)** — Lightweight media reference abstraction: pass around lazily-resolved references to images/video instead of decoded tensors. Install as `mediaref[video]` (the `[video]` extra enables video decoding).

**Lazy Loading & Imports**

- **[scientific-python/lazy-loader](https://github.com/scientific-python/lazy-loader)** — PEP 562 lazy submodule loading; cuts import time for big packages.
- **[MilkClouds/lazyregistry](https://github.com/MilkClouds/lazyregistry)** — Lazy-loading registry with namespace support and type safety; register by name, construct on first access. Pairs well with `lazy-loader`.

**Testing**

- **[pytest-dev/pytest](https://github.com/pytest-dev/pytest)** — The test runner. Plus the plugins I always add:
  - **[pytest-dev/pytest-cov](https://github.com/pytest-dev/pytest-cov)** — Coverage reporting (`--cov`).
  - **[pytest-dev/pytest-subtests](https://github.com/pytest-dev/pytest-subtests)** — `subtests` fixture for multiple soft assertions in one test.
  - **[pytest-dev/pytest-timeout](https://github.com/pytest-dev/pytest-timeout)** — Per-test timeouts; kills hangs in CI.

**Dev Tooling — Lint, Types, Build**

- **[astral-sh/ruff](https://github.com/astral-sh/ruff)** — Linter + formatter in one, Rust-fast. Replaces flake8/isort/black.
- **[astral-sh/ty](https://github.com/astral-sh/ty)** — Astral's fast type checker (Rust).
- **[facebook/pyrefly](https://github.com/facebook/pyrefly)** — Meta's fast type checker (Rust). Tracked alongside `ty` as the next-gen alternatives to mypy/pyright.
- **[pypa/hatch](https://github.com/pypa/hatch)** — Project & build management. **Default to hatch for new projects — avoid setuptools.**
