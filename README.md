# Claude Monitor

Local dashboard for Claude Code token usage, cache efficiency, and context overhead.

## Run

```bash
yarn install
yarn dev      # starts server (:4173) + client (:5173)
```

Open http://localhost:5173.

## Build & start production

```bash
yarn build
yarn start
```

Open http://127.0.0.1:4173.

Reads from `~/.claude/projects/**/*.jsonl`. Localhost-only. No data leaves your machine.
