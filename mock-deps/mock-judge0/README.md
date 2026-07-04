# mock-judge0

A tiny, **dependency-free** mock of the [Judge0 CE](https://ce.judge0.com) HTTP
API for local development. Judge0's Docker setup runs poorly on macOS, so this
stands in for it — it speaks the same wire contract the worker expects but
**executes no code**; it just returns deterministic dummy results.

It implements exactly the surface `worker/src/clients/judge0.ts` uses:

| Method & path | Behaviour |
| --- | --- |
| `POST /submissions?base64_encoded=true&wait=false` | Stores the request, returns `{ token }` (201). With `wait=true`, returns the full result instead. |
| `GET /submissions/:token?base64_encoded=true&fields=…` | Returns the current dummy state. Honours `fields` and base64-encodes text fields. |
| `GET /languages`, `GET /statuses`, `GET /about` | Static info, for realism. |

### Result behaviour

- The first `MOCK_PROCESSING_POLLS` reads of a token report a non-terminal
  **Processing** (status `2`) so the worker's polling loop is actually
  exercised; after that it resolves to a terminal verdict.
- With the default `MOCK_VERDICT=auto`, the terminal verdict is **Accepted**
  (status `3`) and `stdout` echoes the submission's `expected_output`, so output
  checks pass. Set `MOCK_VERDICT` to `wrong_answer`, `tle`, `compile_error`, or
  `runtime_error` to exercise the unhappy paths.

## Run

```bash
cd mock-deps/mock-judge0
npm install
npm run dev        # tsx watch, listens on :2358 by default
```

Then point the worker at it (default `JUDGE0_URL` already matches):

```bash
# worker/.env
JUDGE0_URL=http://localhost:2358
```

## Configuration

Copy `.env.example` to `.env` (all optional):

| Var | Default | Meaning |
| --- | --- | --- |
| `PORT` | `2358` | Port to listen on (match the worker's `JUDGE0_URL`). |
| `MOCK_PROCESSING_POLLS` | `1` | Non-terminal polls before a result resolves. `0` = terminal immediately. |
| `MOCK_VERDICT` | `auto` | `auto` \| `accepted` \| `wrong_answer` \| `tle` \| `compile_error` \| `runtime_error`. |
| `JUDGE0_AUTH_TOKEN` | _unset_ | If set, requests must send a matching `X-Auth-Token` header. |

## Scripts

- `npm run dev` — watch mode via `tsx`.
- `npm run build` / `npm start` — compile to `dist/` and run with plain Node.
- `npm run typecheck` — `tsc --noEmit`.
