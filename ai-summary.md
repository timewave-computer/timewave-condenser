# AI Summary Feature for Timewave Condenser

Timewave Condenser now includes a feature to generate AI-powered summaries of your codebase. This feature takes the XML output from the repository packing process and sends it to AI models like Claude or OpenAI to create comprehensive summaries of your code.

## Generated Summaries

The AI summary feature generates two files:

1. **Markdown Summary** (`summary.md`): A comprehensive overview of your codebase in Markdown format, including:
   - The main purpose of the codebase
   - Key components and their relationships
   - Important functions and data structures
   - Overall architecture and design patterns
   - Any notable algorithms or techniques used

2. **XML Summary** (`summary.xml`): A structured summary in XML format, including:
   - Project metadata (name, purpose, main languages)
   - Component breakdown
   - Key files and their purposes
   - Dependencies
   - Recommendations for improvements

## Usage

### Basic Usage

After packing your repository, you can generate AI summaries with:

```bash
# Using the permanent installation
timewave-condenser summarize -i /path/to/condensed-output.xml -o /path/to/summaries

# Using nix run
nix run git+ssh://git@github.com/timewave-computer/timewave-condenser -- summarize -i /path/to/condensed-output.xml -o /path/to/summaries
```

### Options

- `-i, --input PATH` - Path to the XML file containing your packed repository (required)
- `-o, --output PATH` - Directory where summaries will be saved (required)
- `-p, --provider STRING` - AI provider to use: "claude" or "openai" (default: claude)
- `--max-tokens NUMBER` - Maximum tokens for AI response (default: 4000)
- `--system-prompt STRING` - Custom system prompt for AI
- `--api-key STRING` - API key for the AI provider

### Using Claude

To use Claude (default):

```bash
# Set your Claude API key as an environment variable
export CLAUDE_API_KEY=your_api_key_here

# Run the summarize command
timewave-condenser summarize -i ./output/condensed-output.xml -o ./summaries
```

### Using OpenAI

To use OpenAI instead of Claude:

```bash
# Set your OpenAI API key as an environment variable
export OPENAI_API_KEY=your_api_key_here

# Run the summarize command with OpenAI provider
timewave-condenser summarize -i ./output/condensed-output.xml -o ./summaries -p openai
```

## API Key Setup

The AI summary feature requires access to either Claude or OpenAI's API services. Here's how to set up API keys for each:

### Claude API Setup

#### 1. Create an Anthropic Account
- Visit [Anthropic Console](https://console.anthropic.com/) and sign up for an account
- Complete any verification steps required

#### 2. Generate an API Key
- In the console, navigate to the "API Keys" section
- Click "Create API Key"
- Provide a name for your key (e.g., "Timewave Condenser")
- Set any usage limits or restrictions if desired

#### 3. Store Your API Key Securely
- Copy the generated API key (you'll only see it once)
- Store it securely, avoiding plain text files

#### 4. Use Your API Key
- **Option 1: Environment variable** (recommended):
  ```bash
  export CLAUDE_API_KEY=your_api_key_here
  ```
  You can add this to your shell profile (e.g., `.bashrc`, `.zshrc`) to make it persistent.
  
- **Option 2: Directly in the command**:
  ```bash
  timewave-condenser summarize -i ./input.xml -o ./output --api-key "your_api_key_here"
  ```
  Note: This approach may expose your API key in command history and process listings.

### OpenAI API Setup

#### 1. Create an OpenAI Account
- Visit [OpenAI Platform](https://platform.openai.com/) and sign up for an account
- Add a payment method (API usage will incur charges)

#### 2. Generate an API Key
- In your account, navigate to "API keys"
- Click "Create new secret key"
- Provide a name for your key

#### 3. Store Your API Key Securely
- Copy the generated API key (you'll only see it once)
- Store it securely

#### 4. Use Your API Key
- **Option 1: Environment variable** (recommended):
  ```bash
  export OPENAI_API_KEY=your_api_key_here
  ```
  
- **Option 2: Directly in the command**:
  ```bash
  timewave-condenser summarize -i ./input.xml -o ./output -p openai --api-key "your_api_key_here"
  ```

### Security Best Practices

Here are important security considerations when working with API keys:

- **Never hardcode API keys** in scripts or source code
- **Don't commit API keys** to version control systems
- **Consider using credential managers** like [pass](https://www.passwordstore.org/), [1Password CLI](https://developer.1password.com/docs/cli/), or your OS's keychain
- **Rotate keys periodically**, especially for production use
- **Set usage limits** on API keys to prevent unexpected charges
- **Use environment variables** when possible, loaded from secure sources

#### Example with Credential Manager

```bash
# Using 1Password CLI
eval $(op signin)
export CLAUDE_API_KEY=$(op item get "Claude API Key" --fields label=password)
```

### Troubleshooting API Issues

Common issues and solutions when working with AI APIs:

- **Authentication errors**: Double-check that your API key is correct and properly set
- **Rate limit errors**: You might be sending too many requests too quickly
- **Model unavailable**: The specific model might be at capacity or not available in your region
- **Content policy violations**: The API providers have content policies that might reject certain inputs
- **Billing issues**: Ensure your account is in good standing with the provider

## End-to-End Example

Here's a complete example workflow:

```bash
# Pack your repository
timewave-condenser pack -r ./my-project -o ./output

# Generate AI summaries of the codebase
timewave-condenser summarize -i ./output/condensed-output.xml -o ./summaries
```

## Customizing the Prompt

You can customize how the AI processes your codebase by providing a system prompt:

```bash
timewave-condenser summarize -i ./output/condensed-output.xml -o ./summaries \
  --system-prompt "You are an expert software architect specializing in performance optimization. Focus on identifying potential performance bottlenecks in the codebase."
```

## Troubleshooting

Common issues and solutions when using the AI summary feature:

- **API Errors**: If you receive API errors, verify your API key and check that you have sufficient quota with the provider.
- **File Not Found**: Ensure the XML file path is correct and the file exists.
- **Memory Issues**: For large codebases, you might need to increase the max-tokens value.
- **Output Formatting**: If the output isn't well-formatted, try adjusting the system prompt to request more specific structure. 