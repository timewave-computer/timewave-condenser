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

# Change output format (markdown, plain, xml)
nix run git+ssh://git@github.com/timewave-computer/timewave-condenser -- pack -r /path/to/your/repo -f plain -o /path/to/output

# Enable code compression and comment removal
nix run git+ssh://git@github.com/timewave-computer/timewave-condenser -- pack -r /path/to/your/repo --compress --remove-comments -o /path/to/output

# Show help
nix run git+ssh://git@github.com/timewave-computer/timewave-condenser -- help
```

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
- `-o, --output PATH` - Directory where output will be saved (default: ./output)
- `-f, --format FORMAT` - Output format: markdown, plain, xml (default: markdown)
- `--compress` - Enable code compression
- `--remove-comments` - Remove comments from code
- `--no-security-check` - Disable security check

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
2. Run Repomix to generate an `output.md` file containing a packed representation of the current repository

To clean up the generated file:

```bash
npm run clean
```

## Configuration

See the [Repomix documentation](https://repomix.com/guide/usage) for details on configuration options.

## License

MIT 