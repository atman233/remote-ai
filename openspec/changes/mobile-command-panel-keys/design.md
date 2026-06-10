## Context

The mobile command panel renders a flat list of buttons that send raw bytes to the PTY via WebSocket. All commands are visually identical — the user can't distinguish terminal control keys (Esc, Tab) from Claude Code built-in commands (`/resume`) from project custom commands (`/opsx:apply`). The `command-discovery` spec defines what commands exist but doesn't include Esc/Tab/Shift+Tab, nor does it distinguish command categories.

## Goals / Non-Goals

**Goals:**
- Send Esc (`\x1b`), Tab (`\x09`), and Shift+Tab (`\x1b[Z`) from the mobile command panel
- Group commands visually by category with distinct colors and separators
- Zero API surface change beyond adding `kind` to existing response objects

**Non-Goals:**
- Persistent key bar or floating shortcuts (separate change)
- Keyboard-aware dynamic button visibility
- Changing the command panel layout mechanism (still collapsible via handle)

## Decisions

### D1: `kind` field on command objects

**Choice:** Add a `kind` string field to each command object: `"terminal"`, `"builtin"`, or `"project"`.

**Why:** The mobile client needs a formal signal to group and color commands. Alternatives considered:
- *Infer kind from label pattern* (e.g., `/` prefix = builtin) — fragile, conflates project commands that also start with `/`
- *Separate endpoint for each kind* — over-engineered for 3 categories, increases round trips
- *Hardcode grouping in client* — would require client-side knowledge of all built-in command names, breaks when list changes

### D2: Color-coding via CSS classes, not inline styles

**Choice:** Apply CSS classes (`kind-terminal`, `kind-builtin`, `kind-project`) to buttons. Colors defined in `app.css` as custom properties.

**Why:** Consistent with existing CSS architecture. Alternative was passing colors from the daemon — unnecessarily couples presentation to the API.

### D3: Terminal commands grouped first in panel

**Choice:** Render order: terminal group → separator → builtin group → separator → project group.

**Why:** Terminal keys are the most frequently needed during interactive prompts (Esc to cancel, Tab to complete) and benefit from being at the top closest to the terminal. Built-in commands come next as general-purpose tools. Project commands come last since they're the most context-specific.

### D4: Separator between groups, no separator when group is empty

**Choice:** `<div class="cmd-separator"></div>` between groups; skip a group entirely if it has no entries.

**Why:** Avoids a stray separator line when a project has no custom commands (the common case for new projects). Keeps the panel clean.

### D5: Esc and Shift+Tab via daemon-side commands, not client-side shortcuts

**Choice:** Add Esc, Tab, Shift+Tab as entries in `TERMINAL_COMMANDS` in `session-manager.js`, following the existing pattern for Ctrl+C and Ctrl+L.

**Why:** The current architecture already has terminal control commands defined server-side and sent to the client. Adding new ones here requires no client-side protocol changes — they're just more command entries. Alternative considered: hardcoding a key bar in the mobile client — would work but requires new UI infrastructure for a persistent widget that this change intentionally defers.

## Risks / Trade-offs

- **New `kind` field ignored by older clients** → No impact. Old clients get the same flat list they always did, just with an extra JSON field they don't read. The endpoint already returns an array, extra fields are harmless.
- **Panel too tall with 3 groups** → Panel already scrolls internally (`overflow-y: auto`). If project has many custom commands, the project group scrolls while terminal and builtin groups remain at top.
- **Esc byte (`\x1b`) might interfere with terminal state if sent at wrong time** → No more risk than typing any other key at the wrong time. The user controls when they tap the button.
