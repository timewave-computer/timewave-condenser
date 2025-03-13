# Timewave Condenser

A tool for summarizing codebases using AI, part of the Continuous Context Update System.

## Features

- Extracts summaries from codebases in both Markdown and XML formats
- Supports multiple AI providers (Claude and OpenAI)
- Configurable via TOML configuration files
- Area-specific prompts for different parts of a codebase
- Robust error handling with fallback summaries

## Installation

```bash
# Clone the repository
git clone https://github.com/timewave-computer/timewave-condenser.git
cd timewave-condenser

# Install dependencies
npm install

# Build the TypeScript code
npm run build
```

## Usage

### Basic Usage

```bash
# Using Node.js
node dist/summarize.js --input=/path/to/input.xml --output=/path/to/output/dir

# Using npm script
npm start -- --input=/path/to/input.xml --output=/path/to/output/dir
```

### Command Line Options

- `--input`, `-i`: Path to the input XML file (required)
- `--output`, `-o`: Path to the output directory (required)
- `--provider`, `-p`: AI provider to use (`claude` or `openai`, default: `claude`)
- `--config`, `-c`: Path to TOML configuration file
- `--area`, `-a`: Area from TOML config to use for prompt
- `--systemPrompt`: Custom system prompt
- `--maxTokens`: Maximum tokens (default: 4000)
- `--apiKey`: API key (can also use environment variable)
- `--verbose`, `-v`: Enable verbose logging

### Environment Variables

- `CLAUDE_API_KEY`: API key for Claude
- `OPENAI_API_KEY`: API key for OpenAI

## TOML Configuration

The tool supports TOML configuration files for more advanced usage. Here's an example:

```toml
[general]
project_name = "My Project"
default_prompt = "You are a helpful assistant that summarizes codebases."

[areas.frontend]
description = "Frontend components"
included_paths = ["src/components", "src/pages"]
excluded_paths = ["src/components/tests"]
prompt = "Analyze this frontend code and focus on React components and their relationships."

[areas.backend]
description = "Backend services"
included_paths = ["src/services", "src/api"]
excluded_paths = []
prompt = "Analyze this backend code and focus on API endpoints and database interactions."
```

## Development

```bash
# Run in development mode with ts-node
npm run dev -- --input=/path/to/input.xml --output=/path/to/output/dir

# Build the TypeScript code
npm run build
```

## Output

The tool generates two output files:

1. `summary.md`: A comprehensive summary in Markdown format
2. `summary.xml`: A structured summary in XML format

## Error Handling

If the AI API request fails, the tool will generate fallback summary files with error details. 