# Repomix Hello World

This is a simple example of using [Repomix](https://github.com/yamadashy/repomix) to pack a repository into a single file for use with AI systems like Claude, ChatGPT, and other LLMs.

## Setup with Nix

This project includes a Nix flake for easy setup:

```bash
# Enter the development shell
nix develop

# The shell hook will automatically install dependencies
# If it doesn't, you can manually run:
npm install
```

## Running the Example

Once in the development shell, you can run the example with:

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

## Important Note

Repomix requires a directory named `pack` to exist in the project root when using the `pack` command. This is handled automatically by the npm scripts.

## How It Works

The Repomix CLI packs the repository with these features:

1. It targets the current directory to be packed
2. Ignores common directories like node_modules and .git (configured in .repomixignore)
3. Outputs the packed representation as a markdown file

You can modify the options in repomix.config.json to customize the behavior according to your needs.

## Without Nix

If you're not using Nix:

```bash
# Install dependencies
npm install

# Run the example
npm start
```

## Documentation

For more detailed documentation about Repomix, visit the [official repository](https://github.com/yamadashy/repomix). 