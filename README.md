# Timewave Condenser

A tool that uses [Repomix](https://github.com/yamadashy/repomix) to condense Git repositories into single files for AI analysis.

## Quick Start

You can run Timewave Condenser with a single command using Nix with flakes enabled:

```bash
# Since timewave-condenser is a private repository, always use SSH:
nix run git+ssh://git@github.com/timewave-computer/timewave-condenser -- pack -r /path/to/your/repo -o /path/to/output
```

## Features

- **Repository Packing**: Condense entire git repositories into single Markdown and XML files
- **AI Summaries**: Generate AI-powered summaries of your codebase using Claude or OpenAI
- **Format Options**: Output in Markdown, XML, or plain text formats
- **Customizable**: Configure which files to include/exclude, output options, and more
- **Claude Optimization**: XML output is optimized for analysis by Claude AI

## Permanent Installation

For better performance and convenience, you can install Timewave Condenser permanently instead of downloading the source code each time:

```bash
# 1. Clone the repository to a permanent location
git clone git@github.com:timewave-computer/timewave-condenser.git ~/tools/timewave-condenser

# 2. Install it to your Nix profile
cd ~/tools/timewave-condenser
nix profile install .#default

# Now you can use the 'timewave-condenser' command directly
timewave-condenser pack -r /path/to/your/repo -o /path/to/output
```

To update the tool when new changes are available:

```bash
# Pull the latest changes
cd ~/tools/timewave-condenser
git pull

# Update your Nix profile installation
nix profile upgrade
```

### Using the Permanent Installation

After installing to your Nix profile, you can use the command directly without the `nix run` prefix:

```bash
# Basic usage after permanent installation
timewave-condenser pack -r /path/to/your/repo -o /path/to/output

# With custom configuration file
timewave-condenser pack -r /path/to/your/repo -c ./my-config.json -o /path/to/output

# Enable verbose output for debugging
timewave-condenser pack -r /path/to/your/repo -o /path/to/output --verbose

# Change output format (markdown, plain, xml)
timewave-condenser pack -r /path/to/your/repo -f plain -o /path/to/output

# Enable code compression and comment removal
timewave-condenser pack -r /path/to/your/repo --compress --remove-comments -o /path/to/output

# Show help
timewave-condenser help

# Show example configuration
timewave-condenser example-config
```

All the same options are available when using the permanent installation, but the command is much shorter and doesn't require downloading the repository each time.

## Usage with Nix Run

If you prefer not to install the tool permanently, you can still use it with `nix run`:

```bash
# Basic usage (since timewave-condenser is private, always use SSH)
nix run git+ssh://git@github.com/timewave-computer/timewave-condenser -- pack -r /path/to/your/repo -o /path/to/output

# With custom configuration file
nix run git+ssh://git@github.com/timewave-computer/timewave-condenser -- pack -r /path/to/your/repo -c ./my-config.json -o /path/to/output

# Generate AI summary from a packed repository
nix run git+ssh://git@github.com/timewave-computer/timewave-condenser -- summarize -i /path/to/condensed-output.xml -o /path/to/summaries

# Enable verbose output for debugging
nix run git+ssh://git@github.com/timewave-computer/timewave-condenser -- pack -r /path/to/your/repo -o /path/to/output --verbose

# Change output format (markdown, plain, xml)
nix run git+ssh://git@github.com/timewave-computer/timewave-condenser -- pack -r /path/to/your/repo -f plain -o /path/to/output

# Enable code compression and comment removal
nix run git+ssh://git@github.com/timewave-computer/timewave-condenser -- pack -r /path/to/your/repo --compress --remove-comments -o /path/to/output

# Show help
nix run git+ssh://git@github.com/timewave-computer/timewave-condenser -- help

# Show example configuration
nix run git+ssh://git@github.com/timewave-computer/timewave-condenser -- example-config
```

## Output Files

By default, Timewave Condenser generates two output files:

1. **Markdown output** (`condensed-output.md`) - Suitable for viewing in any markdown editor
2. **XML output** (`condensed-output.xml`) - Optimized for AI analysis with Claude

The tool automatically handles both formats for you, so you'll get both files in your output directory without any extra configuration.

## SSH Authentication

Since timewave-condenser is a private repository, SSH authentication is required to access it:

```bash
nix run git+ssh://git@github.com/timewave-computer/timewave-condenser -- [commands]
```

This method uses your SSH key to authenticate with GitHub. Make sure you have:
1. SSH access to the timewave-computer organization
2. Your SSH key added to your GitHub account
3. SSH agent running with your key loaded


## Options

- `-r, --repository PATH` - Path to the git repository to pack (required for pack command)
- `-c, --config PATH` - Path to a Repomix configuration file (optional)
- `-o, --output PATH` - Directory where output will be saved (required)
- `-f, --format FORMAT` - Output format: markdown, plain, xml (default: outputs both markdown and xml)
- `--compress` - Enable code compression
- `--remove-comments` - Remove comments from code
- `--no-security-check` - Disable security check
- `--verbose` - Show detailed output for debugging

### Summarize Command Options

- `-i, --input PATH` - Input XML file path (required)
- `-o, --output PATH` - Output directory for summaries (required)
- `-p, --provider STRING` - AI provider to use (claude, openai) (default: claude)
- `--max-tokens NUMBER` - Maximum tokens for AI response (default: 4000)
- `--system-prompt STRING` - Custom system prompt for AI
- `--api-key STRING` - API key for AI provider (can also use CLAUDE_API_KEY or OPENAI_API_KEY env vars)

## AI Summaries

Timewave Condenser can generate AI-powered summaries of your codebase. After packing a repository, you can use the `summarize` command to create comprehensive overviews of your code.

```bash
# Generate an AI summary (requires API key)
export CLAUDE_API_KEY=your_api_key_here
timewave-condenser summarize -i ./output/condensed-output.xml -o ./summaries
```

This generates two summary files:
- `summary.md` - Markdown overview of your codebase
- `summary.xml` - Structured XML summary

For more details, see [AI Summary Documentation](./ai-summary.md).

### Setting Up API Keys

The `summarize` command requires an API key from either Anthropic (Claude) or OpenAI. Here's how to set up each:

#### Claude API Key

1. Sign up for an account at [Anthropic](https://console.anthropic.com/)
2. Navigate to "API Keys" in your account settings
3. Create a new API key
4. Use the key by either:
   ```bash
   # Setting an environment variable (recommended)
   export CLAUDE_API_KEY=your_api_key_here
   timewave-condenser summarize -i ./input.xml -o ./output
   
   # Or providing it directly (less secure)
   timewave-condenser summarize -i ./input.xml -o ./output --api-key "your_api_key_here"
   ```

#### OpenAI API Key

1. Sign up for an account at [OpenAI](https://platform.openai.com/)
2. Navigate to "API Keys" in your account settings
3. Create a new API key
4. Use the key by either:
   ```bash
   # Setting an environment variable (recommended)
   export OPENAI_API_KEY=your_api_key_here
   timewave-condenser summarize -i ./input.xml -o ./output -p openai
   
   # Or providing it directly (less secure)
   timewave-condenser summarize -i ./input.xml -o ./output -p openai --api-key "your_api_key_here"
   ```

> **Security Note**: Avoid hardcoding API keys in scripts or committing them to version control. Environment variables or secure credential storage are recommended.

## Configuration

You can customize behavior with a configuration file. If you don't provide one, a default configuration is automatically created.

To see an example configuration:

```bash
# When using the permanent installation
timewave-condenser example-config > my-config.json

# Or with nix run
nix run git+ssh://git@github.com/timewave-computer/timewave-condenser -- example-config > my-config.json
```

This will output an example configuration that you can save to a file and customize. By default, the tool looks for a configuration file named `repomix.config.json` in the current directory, but you can specify a different path with the `-c` option.

The configuration file allows you to:

- Specify which files to include/exclude
- Configure output format options
- Set processing parameters like ignoring empty files or binary files
- Enable Claude optimization for XML output

Example configuration:

```json
{
  "include": [
    "src/main.py",
    "src/utils/",
    "docs/"
  ],
  "exclude": [
    "**/*.test.js",
    "**/*.spec.ts",
    "**/node_modules/",
    "**/.git/"
  ],
  "outputs": [
    {
      "format": "markdown",
      "path": "condensed-output.md",
      "options": {
        "removeComments": true,
        "compress": true
      }
    },
    {
      "format": "xml",
      "path": "condensed-output.xml",
      "options": {
        "removeComments": true,
        "compress": false,
        "claudeOptimized": true,
        "addLineNumbers": true,
        "separateByLanguage": true
      }
    }
  ],
  "settings": {
    "ignoreEmptyFiles": true,
    "maxFileSize": 1048576,
    "includeFilePath": true,
    "skipBinaryFiles": true,
    "securityCheck": true
  }
}
```

## Development Setup

This project includes a Nix flake for easy setup:

```bash
# Clone the repository
git clone git@github.com:timewave-computer/timewave-condenser.git
cd timewave-condenser

# Enter the development shell
nix develop

# The shell hook will automatically install dependencies
# If it doesn't, you can manually run:
npm install
```

### Running the Example

Once in the development shell, you can run a simple example with:

```bash
npm start
```

This will:
1. Create a `pack` directory (required by Repomix)
2. Run Repomix to generate output files containing a packed representation of the current repository

To clean up the generated files:

```bash
npm run clean
```

## Troubleshooting

If you encounter issues:

1. Try running with the `--verbose` flag to see detailed output
2. Make sure your repository path exists and is accessible
3. If using a custom configuration file, verify that it's valid JSON
4. If the tool seems to hang, check if the repository is very large (processing may take time)
5. For Nix-related errors, try clearing the Nix cache:
   ```bash
   nix-store --gc
   nix registry remove git+ssh://git@github.com/timewave-computer/timewave-condenser
   ```

## License

MIT 