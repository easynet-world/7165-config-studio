#!/bin/bash

# Config Studio Start Script
# Kills existing config-studio processes and starts a new one

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROCESS_NAME="config-studio"

# Function to kill existing processes
kill_existing_processes() {
    echo "Checking for existing $PROCESS_NAME processes..."
    
    # Find processes by name
    PIDS=$(pgrep -f "$PROCESS_NAME" 2>/dev/null || true)
    
    if [ -n "$PIDS" ]; then
        echo "Found existing $PROCESS_NAME processes: $PIDS"
        echo "Stopping existing processes..."
        
        # Try graceful shutdown first
        for PID in $PIDS; do
            if kill -0 "$PID" 2>/dev/null; then
                kill "$PID" 2>/dev/null || true
            fi
        done
        
        # Wait a bit for graceful shutdown
        sleep 2
        
        # Force kill if still running
        REMAINING=$(pgrep -f "$PROCESS_NAME" 2>/dev/null || true)
        if [ -n "$REMAINING" ]; then
            echo "Force killing remaining processes..."
            for PID in $REMAINING; do
                kill -9 "$PID" 2>/dev/null || true
            done
            sleep 1
        fi
        
        echo "Existing processes stopped."
    else
        echo "No existing $PROCESS_NAME processes found."
    fi
}

# Kill existing processes
kill_existing_processes

# Change to script directory
cd "$SCRIPT_DIR" || exit 1

# Start the server with process name "config-studio"
echo "Starting $PROCESS_NAME..."

# Use exec -a to set the process name on Unix systems
# On macOS/Linux, this sets argv[0] which appears in ps as the process name
# The process will appear as "config-studio" in process lists
if command -v node >/dev/null 2>&1; then
    NODE_CMD="node"
else
    echo "Error: node command not found. Please install Node.js."
    exit 1
fi

# Start the process with the custom name
exec -a "$PROCESS_NAME" "$NODE_CMD" "$SCRIPT_DIR/src/server/index.js" "$@" &
NEW_PID=$!

# Wait a moment to check if process started successfully
sleep 1

# Verify the process is still running
if kill -0 "$NEW_PID" 2>/dev/null; then
    echo "$PROCESS_NAME started successfully (PID: $NEW_PID)"
    echo ""
    echo "To stop the server, run: ./stop.sh"
    echo "Or use: pkill -f $PROCESS_NAME"
else
    echo "Error: Failed to start $PROCESS_NAME"
    exit 1
fi

