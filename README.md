# Timewave Condenser

A powerful tool that uses [Repomix](https://github.com/yamadashy/repomix) to condense Git repositories into single files for AI analysis.

## Quick Start

You can run Timewave Condenser directly from GitHub with a single command (requires [Nix](https://nixos.org/download.html) with flakes enabled):

```bash
# For public repositories
nix run github:timewave-computer/timewave-condenser -- pack -r /path/to/your/repo -o /path/to/output

# For private repositories (using SSH)
nix run git+ssh://git@github.com/timewave-computer/timewave-condenser -- pack -r /path/to/your/repo -o /path/to/output
```

## Usage

```bash
# Basic usage (private repo via SSH)
nix run git+ssh://git@github.com/timewave-computer/timewave-condenser -- pack -r /path/to/your/repo -o /path/to/output

# With custom configuration file
nix run git+ssh://git@github.com/timewave-computer/timewave-condenser -- pack -r /path/to/your/repo -c /path/to/config.json -o /path/to/output

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

## Accessing Private Repositories

If the timewave-condenser repository is private, you need to use SSH authentication:

```bash
nix run git+ssh://git@github.com/timewave-computer/timewave-condenser -- [commands]
```

This method uses your SSH key to authenticate with GitHub, which is necessary for private repositories.

### Setting up a Convenient Alias

To make using the tool easier, you can add an alias to your shell configuration (~/.bashrc, ~/.zshrc, etc.):

```bash
# For public repos
alias timewave-condenser='nix run github:timewave-computer/timewave-condenser --'

# For private repos via SSH
alias timewave-condenser='nix run git+ssh://git@github.com/timewave-computer/timewave-condenser --'
```

Then you can simply run:

```bash
timewave-condenser pack -r /path/to/your/repo -o /path/to/output
```

## Options

- `-r, --repository PATH` - Path to the git repository to pack (required)
- `-c, --config PATH` - Path to a Repomix configuration file (optional)
- `-o, --output PATH` - Directory where output will be saved (required)
- `-f, --format FORMAT` - Output format: markdown, plain, xml (default: outputs both markdown and xml)
- `--compress` - Enable code compression
- `--remove-comments` - Remove comments from code
- `--no-security-check` - Disable security check
- `--verbose` - Show detailed output for debugging

## Configuration

You can customize behavior with a configuration file. If you don't provide one, a default configuration is automatically created.

To see an example configuration:

```bash
nix run git+ssh://git@github.com/timewave-computer/timewave-condenser -- example-config
```

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