# Python Libraries I Reach For

A curated list of Python libraries worth defaulting to, grouped by purpose.
Pins and extras are written exactly as installed.

### Web & API

- **[litestar](https://github.com/litestar-org/litestar)** — Fast, batteries-included ASGI web framework. DI, msgspec-based (de)serialization, OpenAPI out of the box. Preferred over FastAPI for larger apps.

### HTTP Clients

- **[niquests](https://github.com/jawah/niquests)** — Drop-in `requests` replacement: same API, adds HTTP/2 & HTTP/3, async, connection multiplexing. Use instead of `requests`.

### Async

- **[anyio](https://anyio.readthedocs.io/)** — Async abstraction layer over asyncio/trio. Structured concurrency (task groups), portable primitives. The async foundation many modern libs build on.

### ML / Hugging Face Stack

- **`transformers[kernels]`** — Hugging Face Transformers with the `kernels` extra for optimized fused kernels. **Install this instead of plain `transformers`.**
- **[accelerate](https://github.com/huggingface/accelerate)** — Device placement, mixed precision, and multi-GPU/distributed launch without boilerplate.
- **[datasets](https://github.com/huggingface/datasets)** — Memory-mapped (Arrow) datasets, streaming, fast `map`/filter, hub integration.

### CLI & Config

- **`jsonargparse[signatures]>=4.27`** — Build CLIs/configs straight from type signatures; nested dataclass/class instantiation from YAML. The engine behind Lightning CLI. The `[signatures]` extra enables signature introspection.

### Serialization & Validation

- **[msgspec](https://github.com/jcrist/msgspec)** — Extremely fast serialization + validation. `Struct` types with type-checked decoding for JSON and MessagePack; far faster than pydantic for pure (de)serialization. Used internally by litestar.

### Media

- **`mediaref[video]`** — Lightweight media reference abstraction: pass around lazily-resolved references to images/video instead of decoded tensors. The `[video]` extra enables video decoding.

### Lazy Loading & Imports

- **[lazy-loader](https://github.com/scientific-python/lazy-loader)** — Scientific-Python's PEP 562 lazy submodule loading; cuts import time for big packages.
- **lazyregistry** — Registry pattern with lazy instantiation; register by name, construct on first access.

### Testing

- **[pytest](https://docs.pytest.org/)** — The test runner. Plus the plugins I always add:
  - **pytest-cov** — Coverage reporting (`--cov`).
  - **pytest-subtests** — `subtests` fixture for multiple soft assertions in one test.
  - **pytest-timeout** — Per-test timeouts; kills hangs in CI.

### Dev Tooling — Lint, Types, Build

- **[ruff](https://github.com/astral-sh/ruff)** — Linter + formatter in one, Rust-fast. Replaces flake8/isort/black.
- **[ty](https://github.com/astral-sh/ty)** — Astral's fast type checker (Rust).
- **[pyrefly](https://github.com/facebook/pyrefly)** — Meta's fast type checker (Rust). Tracked alongside `ty` as the next-gen alternatives to mypy/pyright.
- **[hatch](https://hatch.pypa.io/)** — Project & build management. **Default to hatch for new projects — avoid setuptools.**
