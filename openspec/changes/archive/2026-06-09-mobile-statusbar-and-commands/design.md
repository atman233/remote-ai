## Context

The mobile app runs inside a Capacitor WebView on Android. The current implementation has two gaps:

**Status bar:** The existing `status-bar-adaptation` spec requires runtime height detection via the Capacitor StatusBar plugin, but `app.js` never imports or calls it. Only a CSS `env(safe-area-inset-top)` fallback is used, which returns 0 in most Android WebView contexts because it depends on the `viewport-fit=cover` meta tag (also missing). Result: the top bar sits at y=0, overlapped by the system status bar.

**Command discovery:** The daemon's `loadCommands()` reads from `.claude/commands.json` (which doesn't exist — the project uses `.claude/commands/` directory with markdown files instead) and falls back to 5 hardcoded terminal helpers. The actual slash commands (`/opsx:apply`, `/opsx:propose`, etc.) are never surfaced in the mobile command panel.

## Goals / Non-Goals

**Goals:**
- Top bar and drawer render below the device status bar on all Android devices
- Command panel shows Claude Code built-in commands and project-specific custom commands
- Auto-discovery of commands from `.claude/commands/` directory structure (no manual JSON config)

**Non-Goals:**
- Handling iOS safe areas (app is Android-only)
- Command descriptions, icons, or grouping in the panel UI
- Editing/creating commands from mobile

## Decisions

### D1: StatusBar height via Capacitor plugin, not CSS-only

**Choice:** Call `StatusBar.getHeight()` at app startup and set `--safe-top` as a JS-computed CSS variable on `:root`.

**Why:** CSS `env(safe-area-inset-top)` is unreliable in Android WebView. It requires `viewport-fit=cover` and even then Android manufacturers behave inconsistently. The Capacitor plugin reads the actual measured height from the Android system via `WindowInsets`.

**Alternative:** `StatusBar.setOverlaysWebView(false)` — this pushes the entire WebView below the status bar without manual padding. Rejected because it can cause layout flickering on resize and gives less control over the drawer overlay behavior.

### D2: Auto-discover commands from directory, not JSON config

**Choice:** Recursively scan `.claude/commands/` for `.md` files and derive command labels from file paths. Include a fixed set of Claude Code built-in commands. Deprecate `.claude/commands.json`.

**Why:** The project already uses `.claude/commands/<name>/<cmd>.md` convention for slash commands. Auto-discovery eliminates the need to maintain a parallel JSON file. Path-to-label conversion is predictable: `opsx/apply.md` → `/opsx:apply`.

**Alternative:** Keep JSON as an override layer. Adds unnecessary maintenance burden for single-user system.

### D3: Command file naming convention

**Choice:** Convert path `dir/file.md` to label `/dir:file`. Skip files not matching the expected pattern (e.g., skip README.md, skip hidden files).

**Why:** Matches how Claude Code registers slash commands — the directory becomes the namespace, the file name becomes the command name.

## Risks / Trade-offs

- **StatusBar plugin may fail silently** → Fall back to `env(safe-area-inset-top, 24px)` with a sensible default (24px ≈ typical Android status bar)
- **`.claude/commands/` might not exist** → Gracefully return only built-in commands, don't error
- **Too many commands might overflow the panel** → Panel already scrolls; command count is bounded by the number of markdown files in `.claude/commands/`, typically < 20
