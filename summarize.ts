import fs from 'fs';
import axios from 'axios';
import path from 'path';
import minimist from 'minimist';
import * as TOML from '@iarna/toml';
import { 
  TOMLConfig, 
  GeneralConfig, 
  AreaConfig, 
  SummaryOutput,
  loadTOMLConfig,
  getSystemPrompt,
  extractMarkdownSummary,
  extractXMLSummary,
  generateFallbackSummaries
} from './utils';

interface ProviderConfig {
  url: string;
  headers: (apiKey: string) => Record<string, string>;
  formatRequest: (content: string, systemPrompt: string, maxTokens: number) => any;
  parseResponse: (response: any) => SummaryOutput;
}

interface Arguments {
  input: string;
  output: string;
  provider: string;
  systemPrompt: string;
  maxTokens: number;
  apiKey?: string;
  config?: string;
  area?: string;
  verbose?: boolean;
}

// Configure API settings based on provider
const providers: Record<string, ProviderConfig> = {
  claude: {
    url: 'https://api.anthropic.com/v1/messages',
    headers: (apiKey: string) => ({
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': apiKey
    }),
    formatRequest: (content: string, systemPrompt: string, maxTokens: number) => ({
      model: 'claude-3-opus-20240229',
      max_tokens: maxTokens,
      system: systemPrompt || 'You are a helpful assistant that summarizes codebases.',
      messages: [
        {
          role: 'user', 
          content: [
            { 
              type: 'text', 
              text: `This is a codebase XML file. Please analyze it and provide two summaries:
1. A comprehensive summary in Markdown format that explains:
   - The main purpose of the codebase
   - Key components and their relationships
   - Important functions and data structures
   - Overall architecture and design patterns
   - Any notable algorithms or techniques used

2. A structured summary in XML format that includes:
   - <project> tag with name, purpose, and main languages
   - <components> section with individual <component> entries
   - <files> section highlighting key files and their purposes
   - <dependencies> section if dependencies are clear from the code
   - <recommendations> for potential improvements`
            },
            {
              type: 'file',
              file_path: 'codebase.xml',
              mime_type: 'application/xml',
              data: (() => {
                try {
                  return fs.readFileSync(args.input, 'base64');
                } catch (error) {
                  throw new Error(`Failed to read input file in base64 format: ${error instanceof Error ? error.message : String(error)}`);
                }
              })()
            }
          ]
        }
      ]
    }),
    parseResponse: (response: any): SummaryOutput => ({
      markdown: extractMarkdownSummary(response.content[0].text),
      xml: extractXMLSummary(response.content[0].text)
    })
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    headers: (apiKey: string) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }),
    formatRequest: (content: string, systemPrompt: string, maxTokens: number) => ({
      model: 'gpt-4-turbo',
      max_tokens: maxTokens,
      messages: [
        {
          role: 'system',
          content: systemPrompt || 'You are a helpful assistant that summarizes codebases.'
        },
        {
          role: 'user',
          content: `This is a codebase XML file. Please analyze it and provide two summaries:
1. A comprehensive summary in Markdown format that explains:
   - The main purpose of the codebase
   - Key components and their relationships
   - Important functions and data structures
   - Overall architecture and design patterns
   - Any notable algorithms or techniques used

2. A structured summary in XML format that includes:
   - <project> tag with name, purpose, and main languages
   - <components> section with individual <component> entries
   - <files> section highlighting key files and their purposes
   - <dependencies> section if dependencies are clear from the code
   - <recommendations> for potential improvements

Here's the codebase in XML format:

${content}`
        }
      ]
    }),
    parseResponse: (response: any): SummaryOutput => ({
      markdown: extractMarkdownSummary(response.choices[0].message.content),
      xml: extractXMLSummary(response.choices[0].message.content)
    })
  }
};

// Parse command line arguments
const args = minimist(process.argv.slice(2), {
  string: ['input', 'output', 'provider', 'systemPrompt', 'apiKey', 'config', 'area'],
  boolean: ['verbose'],
  default: {
    provider: 'claude',
    maxTokens: 4000,
    systemPrompt: '',
    verbose: false
  },
  alias: {
    i: 'input',
    o: 'output',
    p: 'provider',
    c: 'config',
    a: 'area',
    v: 'verbose'
  }
}) as unknown as Arguments;

/**
 * Main function to run the summarization process
 */
export async function main(): Promise<void> {
  try {
    // Validate input and output
    if (!args.input || !args.output) {
      console.error('Error: Input file and output directory are required');
      console.error('Usage: node summarize.js --input=/path/to/input.xml --output=/path/to/output/dir [options]');
      console.error('Options:');
      console.error('  --provider=claude|openai   AI provider to use (default: claude)');
      console.error('  --config=/path/to/config.toml   TOML configuration file');
      console.error('  --area=name   Area from TOML config to use for prompt');
      console.error('  --systemPrompt="custom prompt"   Custom system prompt');
      console.error('  --maxTokens=number   Maximum tokens (default: 4000)');
      console.error('  --apiKey=key   API key (can also use environment variable)');
      console.error('  --verbose   Enable verbose logging');
      process.exit(1);
    }
    
    // Validate input file exists
    if (!fs.existsSync(args.input)) {
      console.error(`Error: Input file '${args.input}' does not exist`);
      process.exit(1);
    }
    
    // Verify input file is readable
    try {
      fs.accessSync(args.input, fs.constants.R_OK);
    } catch (error) {
      console.error(`Error: Input file '${args.input}' is not readable`);
      process.exit(1);
    }
    
    // Load TOML configuration if provided
    let config: TOMLConfig | null = null;
    if (args.config) {
      config = loadTOMLConfig(args.config, args.verbose);
      if (args.verbose && config) {
        console.log('Loaded TOML configuration:');
        console.log(`Project: ${config.general.project_name}`);
        if (args.area && config.areas[args.area]) {
          console.log(`Using area: ${args.area} - ${config.areas[args.area].description}`);
        }
      }
    }
    
    // Get system prompt
    const systemPrompt = getSystemPrompt(config, args.area, args.systemPrompt);
    if (args.verbose) {
      console.log(`Using system prompt: ${systemPrompt}`);
    }
    
    // Get API key from args or environment variables
    let apiKey = args.apiKey;
    if (!apiKey) {
      if (args.provider === 'claude') {
        apiKey = process.env.ANTHROPIC_API_KEY;
      } else if (args.provider === 'openai') {
        apiKey = process.env.OPENAI_API_KEY;
      }
    }
    
    if (!apiKey) {
      console.error(`Error: No API key provided for ${args.provider}. Use --apiKey or set ${args.provider.toUpperCase()}_API_KEY environment variable.`);
      process.exit(1);
    }
    
    // Read the input file
    console.log(`Reading input file: ${args.input}`);
    let content: string;
    try {
      content = fs.readFileSync(args.input, 'utf8');
    } catch (error) {
      console.error(`Error reading input file: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
    
    // Get provider configuration
    const provider = providers[args.provider];
    if (!provider) {
      console.error(`Error: Unsupported provider "${args.provider}". Supported providers: ${Object.keys(providers).join(', ')}`);
      process.exit(1);
    }
    
    // Create output directory if it doesn't exist
    try {
      fs.mkdirSync(args.output, { recursive: true });
    } catch (error) {
      console.error(`Error creating output directory: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
    
    // Prepare request
    console.log(`Sending request to ${args.provider.toUpperCase()} API...`);
    let requestData;
    try {
      requestData = provider.formatRequest(content, systemPrompt, args.maxTokens);
    } catch (error) {
      console.error(`Error preparing request: ${error instanceof Error ? error.message : String(error)}`);
      generateFallbackSummaries(args.output, error);
      process.exit(1);
    }
    
    if (args.verbose) {
      console.log('Request configuration:');
      console.log(`- Provider: ${args.provider}`);
      console.log(`- Max tokens: ${args.maxTokens}`);
      console.log(`- Model: ${requestData.model || 'default'}`);
    }
    
    try {
      // Make the API call
      const response = await axios.post(
        provider.url, 
        requestData,
        { 
          headers: provider.headers(apiKey),
          timeout: 120000 // 2 minute timeout
        }
      );
      
      // Parse the response
      console.log('Parsing AI response...');
      const summaries = provider.parseResponse(response.data);
      
      // Write the summaries to output files
      const markdownPath = path.join(args.output, 'summary.md');
      const xmlPath = path.join(args.output, 'summary.xml');
      
      console.log(`Writing Markdown summary to: ${markdownPath}`);
      fs.writeFileSync(markdownPath, summaries.markdown);
      
      console.log(`Writing XML summary to: ${xmlPath}`);
      fs.writeFileSync(xmlPath, summaries.xml);
      
      console.log('Summary generation completed successfully!');
    } catch (error: any) {
      if (error.response) {
        // The request was made and the server responded with an error status
        console.error(`HTTP Error ${error.response.status}: ${error.response.statusText}`);
        
        if (error.response.data) {
          console.error('API Error Details:');
          if (typeof error.response.data === 'object') {
            // Pretty print the error response data
            console.error(JSON.stringify(error.response.data, null, 2));
          } else {
            console.error(error.response.data);
          }
        }
        
        // Generate a fallback summary to indicate the error
        generateFallbackSummaries(args.output, error);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error: No response received from API. Check your network connection and API endpoint.');
        generateFallbackSummaries(args.output, new Error('No response received from API'));
      } else {
        // Something else went wrong
        console.error(`Error: ${error.message}`);
        generateFallbackSummaries(args.output, error);
      }
      
      // Exit with error code but create fallback summaries first
      process.exit(1);
    }
  } catch (error) {
    // Catch-all for any other unexpected errors
    console.error('Unexpected error:');
    console.error(error);
    
    // Try to generate fallback summaries if possible
    if (args && args.output) {
      try {
        generateFallbackSummaries(args.output, error);
      } catch (fallbackError) {
        console.error('Failed to generate fallback summaries:', fallbackError);
      }
    }
    
    process.exit(1);
  }
}

// Export args for testing purposes
export { args };

// Run the main function
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
} 