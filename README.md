# Timewave Condenser

A tool for summarizing codebases using AI, part of a Continuous Context Sharing System.

## Overview

Timewave Condenser takes XML representations of your codebase and leverages AI models (Claude or OpenAI) to generate comprehensive summaries. These summaries provide insights into your code's architecture, components, and relationships, making it easier to understand complex codebases.

For a deeper understanding of how this tool fits into the larger Continuous Context Update System, please see the [System Overview](./system_overview.md) document.

## Features

- Extracts summaries from codebases in both Markdown and XML formats
- Supports multiple AI providers (Claude and OpenAI)
- Configurable via TOML configuration files
- Area-specific prompts for different parts of a codebase
- Robust error handling with fallback summaries
- Detailed documentation and examples

## Installation

This project uses Nix for reproducible development environments and CI/CD integration.

```bash
# Clone the repository
git clone https://github.com/timewave-computer/timewave-condenser.git
cd timewave-condenser

# Enter the Nix development shell
nix develop
```

The Nix development shell provides all dependencies needed for development and testing. The flake has been simplified to work optimally in both CI environments and for local development after cloning the repository.

### Requirements

- [Nix package manager](https://nixos.org/download.html) with [flakes enabled](https://nixos.wiki/wiki/Flakes)

## Generated Summaries

The tool generates two output files:

1. **Markdown Summary** (`summary.md`): A comprehensive overview of your codebase, including:
   - The main purpose of the codebase
   - Key components and their relationships
   - Important functions and data structures
   - Overall architecture and design patterns
   - Notable algorithms or techniques used

2. **XML Summary** (`summary.xml`): A structured summary in XML format, including:
   - Project metadata (name, purpose, main languages)
   - Component breakdown
   - Key files and their purposes
   - Dependencies
   - Recommendations for improvements

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

- `ANTHROPIC_API_KEY`: API key for Claude
- `OPENAI_API_KEY`: API key for OpenAI

## API Key Setup

The AI summary feature requires access to either Claude or OpenAI's API services.

### Claude API Setup

1. **Create an Anthropic Account**
   - Visit [Anthropic Console](https://console.anthropic.com/) and sign up
   - Complete verification steps as required

2. **Generate an API Key**
   - Navigate to the "API Keys" section
   - Click "Create API Key"
   - Name your key (e.g., "Timewave Condenser")
   - Set usage limits if desired

3. **Use Your API Key**
   - Option 1: Environment variable (recommended):
     ```bash
     export ANTHROPIC_API_KEY=your_api_key_here
     ```
   - Option 2: Command line parameter:
     ```bash
     node dist/summarize.js --input=input.xml --output=./output --apiKey="your_api_key_here"
     ```

### OpenAI API Setup

1. **Create an OpenAI Account**
   - Visit [OpenAI Platform](https://platform.openai.com/) and sign up
   - Add a payment method

2. **Generate an API Key**
   - Navigate to "API keys"
   - Click "Create new secret key"
   - Name your key

3. **Use Your API Key**
   - Option 1: Environment variable (recommended):
     ```bash
     export OPENAI_API_KEY=your_api_key_here
     ```
   - Option 2: Command line parameter:
     ```