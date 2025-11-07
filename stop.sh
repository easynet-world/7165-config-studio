#!/bin/bash

# Config Studio Stop Script
# Stops all processes named "config-studio"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROCESS_NAME="config-studio"
PID_FILE="$SCRIPT_DIR/.config-studio.pid"

echo "Stopping $PROCESS_NAME..."

# Find processes by name
PIDS=$(pgrep -f "$PROCESS_NAME" 2>/dev/null || true)

if [ -z "$PIDS" ]; then
    echo "No $PROCESS_NAME processes found."
    
    # Check PID file as fallback
    if [ -f "$PID_FILE" ]; then
        SAVED_PID=$(cat "$PID_FILE" 2>/dev/null || true)
        if [ -n "$SAVED_PID" ] && kill -0 "$SAVED_PID" 2>/dev/null; then
            echo "Found process from PID file: $SAVED_PID"
            kill "$SAVED_PID" 2>/dev/null || true
            sleep 1
            if kill -0 "$SAVED_PID" 2>/dev/null; then
                kill -9 "$SAVED_PID" 2>/dev/null || true
            fi
            echo "Process $SAVED_PID stopped."
        fi
        rm -f "$PID_FILE"
    fi
    
    exit 0
fi

echo "Found $PROCESS_NAME processes: $PIDS"

# Try graceful shutdown first
for PID in $PIDS; do
    if kill -0 "$PID" 2>/dev/null; then
        echo "Sending TERM signal to PID $PID..."
        kill "$PID" 2>/dev/null || true
    fi
done

# Wait for graceful shutdown
sleep 2

# Check if any processes are still running
REMAINING=$(pgrep -f "$PROCESS_NAME" 2>/dev/null || true)

if [ -n "$REMAINING" ]; then
    echo "Some processes are still running. Force killing..."
    for PID in $REMAINING; do
        if kill -0 "$PID" 2>/dev/null; then
            echo "Force killing PID $PID..."
            kill -9 "$PID" 2>/dev/null || true
        fi
    done
    sleep 1
fi

# Clean up PID file
if [ -f "$PID_FILE" ]; then
    rm -f "$PID_FILE"
fi

# Final check
FINAL_CHECK=$(pgrep -f "$PROCESS_NAME" 2>/dev/null || true)
if [ -z "$FINAL_CHECK" ]; then
    echo "$PROCESS_NAME stopped successfully."
else
    echo "Warning: Some processes may still be running: $FINAL_CHECK"
    exit 1
fi

