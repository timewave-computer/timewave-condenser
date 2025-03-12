#!/usr/bin/env bash
# Simple script to run Repomix on a repository
set -euo pipefail

# Help message
if [ "$#" -lt 1 ] || [ "$1" = "help" ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
  echo "Timewave Condenser - A tool to pack git repositories using Repomix"
  echo ""
  echo "Usage: ./run-condenser.sh REPO_PATH [OUTPUT_PATH] [FORMAT]"
  echo ""
  echo "Arguments:"
  echo "  REPO_PATH     Path to the repository to pack (required)"
  echo "  OUTPUT_PATH   Path where output will be saved (default: ./output)"
  echo "  FORMAT        Output format: markdown, plain, xml (default: markdown)"
  echo ""
  echo "Example:"
  echo "  ./run-condenser.sh ~/projects/myrepo ~/outputs markdown"
  exit 0
fi

# Get arguments
REPO_PATH="$1"
OUTPUT_PATH="${2:-./output}"
FORMAT="${3:-markdown}"

# Validate repository path
if [ ! -d "$REPO_PATH" ]; then
  echo "Error: Repository path '$REPO_PATH' doesn't exist or is not a directory"
  exit 1
fi

# Create required directories
mkdir -p "$OUTPUT_PATH"
mkdir -p "$REPO_PATH/pack"

# Check for Repomix installation
if ! npm list -g repomix &>/dev/null; then
  echo "Installing Repomix globally..."
  npm install -g repomix
fi

# Run Repomix
echo "Running Repomix to pack repository..."
repomix pack "$REPO_PATH" -o "$OUTPUT_PATH/output.$FORMAT" --style "$FORMAT"

echo ""
echo "Pack completed successfully! Output saved to: $OUTPUT_PATH/output.$FORMAT" 