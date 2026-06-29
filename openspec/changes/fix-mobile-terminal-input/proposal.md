# Fix: Mobile Terminal Input UX

## Why

Mobile app users report two input pain points:

1. **IME composition view shows as a black bar** — xterm.js's composition view renders with `background: #000` at the top of the terminal during IME input, looking like an out-of-place input box
2. **No cursor movement on mobile** — soft keyboards lack arrow keys, making it impossible to fix typos without deleting everything after the mistake

## What

- Override xterm composition view CSS to match the terminal theme
- Remove redundant padding on terminal container
- Add a floating cursor control bar (← → Home End) that auto-hides after 3 seconds
- Add horizontal swipe gestures on the terminal for left/right cursor movement

## Non-goals

- Not adding a full on-screen toolbar or custom keyboard
- Not modifying the daemon or server
- Not adding text selection or copy/paste features

## Capabilities

See `specs/mobile-input-ux/spec.md`
