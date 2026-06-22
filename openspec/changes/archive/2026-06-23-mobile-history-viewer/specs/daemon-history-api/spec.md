## ADDED Requirements

### Requirement: Session history endpoint

Daemon SHALL 提供 `GET /api/sessions/:id/history` HTTP endpoint，返回指定 tmux session 的 pane 历史纯文本。

#### Scenario: Successful history retrieval
- **WHEN** 客户端请求 `GET /api/sessions/:id/history?lines=500`
- **THEN** daemon 执行 `tmux capture-pane -p -S -500 -t <id>`
- **AND** 返回 `{ text: "<captured text>", lines: 500, session: "<id>" }`，HTTP 200

#### Scenario: Default lines parameter
- **WHEN** 客户端请求 `GET /api/sessions/:id/history`（不提供 lines 参数）
- **THEN** daemon 默认使用 `lines=1000`
- **AND** 执行 `tmux capture-pane -p -S -1000 -t <id>`

#### Scenario: Session not found
- **WHEN** 客户端请求一个不存在的 session ID
- **THEN** daemon 返回 `{ error: "会话不存在: <id>" }`，HTTP 404

#### Scenario: Capture timeout
- **WHEN** `tmux capture-pane` 在 5 秒内未返回
- **THEN** daemon 返回 `{ error: "历史获取超时" }`，HTTP 504

#### Scenario: Multiple lines query param
- **WHEN** 客户端请求 `GET /api/sessions/:id/history?lines=2000`
- **THEN** daemon 执行 `tmux capture-pane -p -S -2000 -t <id>`
- **AND** 返回 `{ lines: 2000 }` 反映实际请求的行数
