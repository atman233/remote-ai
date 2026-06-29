# Mobile Input UX

## Composition View

The IME composition view must blend with the terminal theme instead of showing as a black bar.

### Scenario: Chinese pinyin input

- **Given** the user has connected to a project and is at the Claude Code prompt
- **When** the user types pinyin using a Chinese IME keyboard
- **Then** the composition view bar matches the terminal background (`#1e1e1e`) and text color (`#d4d4d4`)

### Scenario: Direct text input

- **Given** the user is typing directly in English
- **When** no IME composition is active
- **Then** no black bar appears at the top of the terminal

## Cursor Control Bar

A floating cursor control bar provides arrow key functionality absent from mobile soft keyboards.

### Scenario: Cursor bar appears on tap

- **Given** the user has connected to a project
- **When** the user taps on the terminal area
- **Then** the cursor control bar becomes visible at the bottom-right of the terminal

### Scenario: Cursor bar auto-hides

- **Given** the cursor control bar is visible
- **When** 3 seconds pass without interaction
- **Then** the cursor control bar fades out and becomes non-interactive

### Scenario: Move cursor left

- **Given** the user is typing at the Claude Code prompt
- **When** the user taps the left arrow button (←) in the cursor bar
- **Then** a left arrow escape sequence (`\x1b[D`) is sent and Claude Code moves the cursor left one character

### Scenario: Move cursor right

- **Given** the user is typing at the Claude Code prompt
- **When** the user taps the right arrow button (→) in the cursor bar
- **Then** a right arrow escape sequence (`\x1b[C`) is sent and Claude Code moves the cursor right one character

### Scenario: Jump to beginning of line

- **Given** the user is typing at the Claude Code prompt with cursor not at the start
- **When** the user taps the Home button (↤) in the cursor bar
- **Then** Ctrl-A (`\x01`) is sent and Claude Code moves the cursor to the beginning of the line

### Scenario: Jump to end of line

- **Given** the user is typing at the Claude Code prompt with cursor not at the end
- **When** the user taps the End button (↦) in the cursor bar
- **Then** Ctrl-E (`\x05`) is sent and Claude Code moves the cursor to the end of the line

## Swipe Gestures

Horizontal swipe gestures on the terminal provide a natural way to move the cursor.

### Scenario: Swipe right moves cursor right

- **Given** the user has connected to a project
- **When** the user swipes horizontally right on the terminal for more than 30px
- **Then** a right arrow escape sequence is sent
- **And** the cursor bar briefly appears

### Scenario: Swipe left moves cursor left

- **Given** the user has connected to a project
- **When** the user swipes horizontally left on the terminal for more than 30px
- **Then** a left arrow escape sequence is sent
- **And** the cursor bar briefly appears

### Scenario: Vertical swipe does not trigger

- **Given** the user has connected to a project
- **When** the user swipes predominantly vertically on the terminal (scroll gesture)
- **Then** no arrow escape sequence is sent
