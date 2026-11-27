# Graph Report - VibeVoice  (2026-11-27)

## Corpus Check
- 37 files · ~17,065 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 260 nodes · 295 edges · 29 communities (20 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8e9d0080`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- livekit-token/route.ts
- compilerOptions
- dependencies
- RoomShell
- VibeVoice — Feature Specification
- devDependencies
- What You Must Do When Invoked
- room-shell.tsx
- VibeVoice
- package.json
- layout.tsx
- HomeShell
- graphify reference: extra exports and benchmark
- include
- deploy.sh
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- AGENTS.md
- eslint.config.mjs
- next.config.ts
- graphify reference: query, path, explain
- next-env.d.ts
- graphify reference: incremental update and cluster-only
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- extraction-spec.md
- privacy/page.tsx

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `RoomShell()` - 13 edges
3. `VibeVoice — Feature Specification` - 12 edges
4. `What You Must Do When Invoked` - 11 edges
5. `POST()` - 10 edges
6. `/graphify` - 10 edges
7. `ScreenTrack()` - 9 edges
8. `graphify reference: extra exports and benchmark` - 8 edges
9. `zoomAt()` - 7 edges
10. `scripts` - 7 edges

## Surprising Connections (you probably didn't know these)
- `onWheel()` --calls--> `zoomAt()`  [EXTRACTED]
  components/room-shell.tsx → lib/zoom.ts
- `POST()` --calls--> `getAppConfig()`  [EXTRACTED]
  app/api/livekit-token/route.ts → lib/config.ts
- `POST()` --calls--> `createLiveKitToken()`  [EXTRACTED]
  app/api/livekit-token/route.ts → lib/livekit.ts
- `POST()` --calls--> `createParticipantIdentity()`  [EXTRACTED]
  app/api/livekit-token/route.ts → lib/livekit.ts
- `POST()` --calls--> `derivePrivateRoomName()`  [EXTRACTED]
  app/api/livekit-token/route.ts → lib/rooms.ts

## Import Cycles
- None detected.

## Communities (29 total, 9 thin omitted)

### Community 0 - "livekit-token/route.ts"
Cohesion: 0.16
Nodes (20): badRequest(), isTokenBody(), POST(), getRequestOrigin(), POST(), AppConfig, getAppConfig(), parsePositiveInt() (+12 more)

### Community 1 - "compilerOptions"
Cohesion: 0.11
Nodes (19): dom, dom.iterable, esnext, compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules (+11 more)

### Community 2 - "dependencies"
Cohesion: 0.13
Nodes (15): clsx, livekit-server-sdk, lucide-react, next, dependencies, clsx, livekit-client, livekit-server-sdk (+7 more)

### Community 3 - "RoomShell"
Cohesion: 0.15
Nodes (10): PageProps, FakeRoom, Handler, RoomShell(), bindRoomEvents(), enableMicrophone(), joinRoom(), refreshParticipants() (+2 more)

### Community 4 - "VibeVoice — Feature Specification"
Cohesion: 0.12
Nodes (16): 10. Known gaps (spec vs. current implementation), 11. Test report (2026-11-26), 1. Purpose and scope, 2. Privacy model (non-functional, applies to every feature), 3. Configuration, 4. Room creation — `POST /api/rooms`, 5. Private room naming, 6. Join token — `POST /api/livekit-token` (+8 more)

### Community 5 - "devDependencies"
Cohesion: 0.09
Nodes (23): eslint, eslint-config-next, jsdom, devDependencies, eslint, eslint-config-next, jsdom, @testing-library/jest-dom (+15 more)

### Community 6 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (23): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+15 more)

### Community 7 - "room-shell.tsx"
Cohesion: 0.17
Nodes (14): ChatMessage, ConnectionState, decodeMessage(), ParticipantView, ScreenTrack(), onPointerMove(), onWheel(), TokenResponse (+6 more)

### Community 8 - "VibeVoice"
Cohesion: 0.29
Nodes (6): ARM64 Docker Build, Development, Environment, Privacy Model, Required Services, VibeVoice

### Community 9 - "package.json"
Cohesion: 0.15
Nodes (12): name, overrides, postcss, private, scripts, build, dev, lint (+4 more)

### Community 12 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 13 - "include"
Cohesion: 0.22
Nodes (8): .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx, exclude, include

### Community 14 - "deploy.sh"
Cohesion: 0.70
Nodes (4): die(), remote(), deploy.sh script, step()

### Community 15 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 16 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 19 - "next.config.ts"
Cohesion: 0.50
Nodes (3): csp, nextConfig, securityHeaders

### Community 20 - "graphify reference: query, path, explain"
Cohesion: 0.50
Nodes (3): For /graphify explain, For /graphify path, graphify reference: query, path, explain

### Community 23 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

## Knowledge Gaps
- **126 isolated node(s):** `metadata`, `viewport`, `metadata`, `dynamic`, `PageProps` (+121 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `RoomShell()` connect `RoomShell` to `HomeShell`, `room-shell.tsx`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `metadata`, `viewport`, `metadata` to the rest of the system?**
  _126 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Should `VibeVoice — Feature Specification` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._