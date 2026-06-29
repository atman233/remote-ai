# Design: Mobile Terminal Input UX

## Approach

### Composition view fix

xterm.js injects CSS at runtime (when `term.open()` is called), so our overrides must use higher specificity. The selector `#terminal-container .xterm .composition-view` beats the base `.xterm .composition-view`. Change `background` from `#000` to `#1e1e1e` and `color` from `#FFF` to `#d4d4d4` to match the terminal theme.

### Cursor control bar

A floating `<div>` appended to `<body>` containing 4 circular buttons:
- ↤ Home: sends `\x01` (Ctrl-A, readline beginning-of-line)
- ← Left: sends `\x1b[D` (left arrow)
- → Right: sends `\x1b[C` (right arrow)
- ↦ End: sends `\x05` (Ctrl-E, readline end-of-line)

Behavior:
- Hidden by default (`opacity: 0; pointer-events: none`)
- Shown on terminal tap (`touchstart`) and on button press
- Auto-hides after 3 seconds via `setTimeout`
- Buttons send directly via `ws.send()` bypassing the terminal `onData` handler

### Swipe gestures

`touchstart`/`touchend` listeners on `#terminal-container`:
- Track `touchStartX`, `touchStartY`
- On `touchend`, compute delta
- Trigger if `|dx| > 30px` AND `|dx| > |dy| * 1.5` (horizontal dominance)
- `dx > 0` → right arrow, `dx < 0` → left arrow

### Terminal padding cleanup

Remove `padding: 4px` from `#terminal-container` — the `.xterm` selector already adds its own `padding: 4px`, so this was redundant 8px total padding at the top.

## Files changed

- `mobile/app.css` — composition view override, remove redundant padding, cursor bar styles
- `mobile/src/app.js` — cursor bar creation, swipe gesture detection, helper functions
