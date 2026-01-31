#!/bin/bash
# Start Claude Code in a new terminal tab with dangerously-skip-permissions

WORKSPACE_DIR="${SUPERSET_ROOT_PATH:-$(pwd)}"

# Open new Terminal tab and run Claude
osascript <<EOF
tell application "Terminal"
    activate
    tell application "System Events" to keystroke "t" using {command down}
    delay 0.5
    do script "cd '$WORKSPACE_DIR' && claude --dangerously-skip-permissions" in front window
end tell
EOF
