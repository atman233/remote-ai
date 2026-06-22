## 1. Daemon — History API

- [x] 1.1 Add `GET /api/sessions/:id/history` endpoint: validate session exists via `sessionExists()`, parse `lines` query param (default 1000, max 5000), execute `tmux capture-pane -p -S -<N> -t <id>` with 5s timeout via `execSync`, return `{ text, lines, session }` on success, 404 if session missing, 504 on timeout

## 2. Mobile — HTML

- [x] 2.1 Add bottom sheet HTML to `index.html`: `#history-sheet` container with `#history-sheet-header` (title "对话历史" + close button) and `#history-content` pre element
- [x] 2.2 Add `#history-sheet-overlay` for dismissing by tapping outside the sheet

## 3. Mobile — CSS

- [x] 3.1 Add bottom sheet styles: fixed bottom, ~60vh height, slide-up transform transition, dark bg matching terminal, rounded top corners
- [x] 3.2 Add sheet overlay style: semi-transparent black, fades in/out with sheet
- [x] 3.3 Add sheet header style: title + close button, matches dark theme
- [x] 3.4 Add sheet content style: monospace font, pre-wrap, overflow-y auto, padding
- [x] 3.5 Replace `.scroll-btns` (two buttons) with single `.history-toggle-btn` style: same position (bottom-right), single icon button
- [x] 3.6 Remove `#history-overlay`, `#history-overlay-header`, `#history-overlay-close` CSS rules
- [x] 3.7 Add error hint style for API failure indicator at bottom of sheet

## 4. Mobile — JS

- [x] 4.1 Replace `initScrollButtons()` with `initHistoryButton()`: create single floating button (📜), append to body, click toggles bottom sheet open
- [x] 4.2 Implement `openHistorySheet()`: add `active` class to sheet + overlay, populate content with `scrollbackBuf` immediately, call `fetchHistory()` in background
- [x] 4.3 Implement `closeHistorySheet()`: remove `active` class from sheet + overlay
- [x] 4.4 Implement `fetchHistory()`: GET `/api/sessions/:id/history?lines=1000` with auth headers, on success replace sheet content, on failure show error hint
- [x] 4.5 Bind close events: close button click, overlay click → `closeHistorySheet()`
- [x] 4.6 Remove old `showHistory()` / `hideHistory()` functions and `historyOverlay` / `historyContent` references
- [x] 4.7 Update `ws.onmessage` scrollback accumulation: remove overlay update logic (no longer needed), keep buffer accumulation

## 5. Verification

- [x] 5.1 Test daemon history API with curl: valid session, missing session, custom lines param
- [x] 5.2 Test bottom sheet opens with scrollbackBuf content instantly, then updates with API data
- [x] 5.3 Test close via ✕ button and overlay tap
- [x] 5.4 Test scrollbackBuf continues accumulating while sheet is closed
- [x] 5.5 Test error state: API unavailable → scrollbackBuf shown + error hint
