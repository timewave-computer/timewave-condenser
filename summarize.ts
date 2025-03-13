import fs from 'fs';
import axios from 'axios';
import path from 'path';
import minimist from 'minimist';
import * as TOML from '@iarna/toml';

// Type definitions for configuration
interface GeneralConfig {
  project_name: string;
  default_prompt: string;
}

interface AreaConfig {
  description: string;
  included_paths: string[];
  excluded_paths: string[];
  prompt: string;
}

interface TOMLConfig {
  general: GeneralConfig;
  areas: Record<string, AreaConfig>;
}

interface SummaryOutput {
  markdown: string;
  xml: string;
}

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
              data: fs.readFileSync(args.input, 'base64')
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
  number: ['maxTokens'],
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
 * Load and parse TOML configuration file
 * @param configPath Path to the TOML configuration file
 * @returns Parsed configuration or null if file doesn't exist
 */
function loadTOMLConfig(configPath: string): TOMLConfig | null {
  try {
    if (!fs.existsSync(configPath)) {
      if (args.verbose) {
        console.log(`Configuration file not found at ${configPath}`);
      }
      return null;
    }
    
    const configContent = fs.readFileSync(configPath, 'utf8');
    return TOML.parse(configContent) as TOMLConfig;
  } catch (error) {
    console.error(`Error parsing TOML configuration: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Get system prompt from config or fall back to default
 * @param config TOML configuration
 * @param areaName Area name to get prompt for
 * @returns System prompt string
 */
function getSystemPrompt(config: TOMLConfig | null, areaName?: string): string {
  // If no config or specified prompt, use the provided prompt
  if (!config || !areaName) {
    return args.systemPrompt;
  }
  
  // Get area-specific prompt or fall back to default
  if (config.areas[areaName]) {
    return config.areas[areaName].prompt;
  }
  
  return config.general.default_prompt;
}

/**
 * Extract markdown summary from AI response text
 * @param text AI response text
 * @returns Extracted markdown summary
 */
function extractMarkdownSummary(text: string): string {
  try {
    // If we find markdown code fences, extract that content
    const markdownMatch = text.match(/```markdown([\s\S]*?)```/) || 
                         text.match(/```md([\s\S]*?)```/) || 
                         text.match(/# (.*?)\n([\s\S]*?)(?=\n```xml|<\?xml|$)/);
    
    if (markdownMatch) {
      return markdownMatch[0].startsWith('```') 
        ? markdownMatch[1].trim() 
        : markdownMatch[0].trim();
    }
    
    // Just extract the part before any XML
    const parts = text.split(/<\?xml|```xml/);
    return parts[0].trim();
  } catch (error) {
    console.error('Error extracting markdown summary:', error);
    return '# Error Extracting Summary\n\nUnable to extract a proper markdown summary from the AI response.';
  }
}

/**
 * Extract XML summary from AI response text
 * @param text AI response text
 * @returns Extracted XML summary
 */
function extractXMLSummary(text: string): string {
  try {
    // Try to find XML content in code blocks
    const xmlMatch = text.match(/```xml([\s\S]*?)```/) || 
                    text.match(/<\?xml([\s\S]*?)(?=```|$)/);
    
    if (xmlMatch) {
      // Clean up the XML content and ensure it has XML declaration
      let xml = xmlMatch[0].startsWith('```') 
        ? xmlMatch[1].trim() 
        : xmlMatch[0].trim();
      
      if (!xml.startsWith('<?xml')) {
        xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + xml;
      }
      return xml;
    }
    
    // If no clear XML section found, create a basic XML summary
    return `<?xml version="1.0" encoding="UTF-8"?>
<summary>
  <error>No structured XML summary could be extracted from the AI response.</error>
  <raw_response>${text.replace(/[<>&'"]/g, (c: string): string => {
      const replacements: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        "'": '&apos;',
        '"': '&quot;'
      };
      return replacements[c] || c;
    })}</raw_response>
</summary>`;
  } catch (error) {
    console.error('Error extracting XML summary:', error);
    return `<?xml version="1.0" encoding="UTF-8"?>
<summary>
  <error>An error occurred while extracting the XML summary.</error>
  <details>${error instanceof Error ? error.message : String(error)}</details>
</summary>`;
  }
}

/**
 * Main function to run the summarization process
 */
async function main(): Promise<void> {
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
    
    // Load TOML configuration if provided
    let config: TOMLConfig | null = null;
    if (args.config) {
      config = loadTOMLConfig(args.config);
      if (args.verbose && config) {
        console.log('Loaded TOML configuration:');
        console.log(`Project: ${config.general.project_name}`);
        if (args.area && config.areas[args.area]) {
          console.log(`Using area: ${args.area} - ${config.areas[args.area].description}`);
        }
      }
    }
    
    // Get system prompt
    const systemPrompt = getSystemPrompt(config, args.area);
    if (args.verbose) {
      console.log(`Using system prompt: ${systemPrompt}`);
    }
    
    // Get API key from args or environment variables
    let apiKey = args.apiKey;
    if (!apiKey) {
      if (args.provider === 'claude') {
        apiKey = process.env.CLAUDE_API_KEY;
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
    const content = fs.readFileSync(args.input, 'utf8');
    
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
    const requestData = provider.formatRequest(content, systemPrompt, args.maxTokens);
    
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
    process.exit(1);
  }
}

/**
 * Generate fallback summary files when API request fails
 * @param outputDir Output directory
 * @param error Error object
 */
function generateFallbackSummaries(outputDir: string, error: any): void {
  try {
    console.log('Generating fallback summary files due to API error...');
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const timestamp = new Date().toISOString();
    
    // Create fallback markdown summary
    const markdownContent = `# API Request Error Summary

## Error Details

- **Timestamp**: ${timestamp}
- **Error**: ${errorMessage}

## Next Steps

Please try again later or check:

1. Your API keys are correct
2. The API service is available
3. Your network connection is stable
4. The input file is valid XML

`;
    
    // Create fallback XML summary
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<summary>
  <error>
    <timestamp>${timestamp}</timestamp>
    <message>${errorMessage.replace(/[<>&'"]/g, (c: string): string => {
      const replacements: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        "'": '&apos;',
        '"': '&quot;'
      };
      return replacements[c] || c;
    })}</message>
  </error>
</summary>`;
    
    // Write fallback files
    fs.writeFileSync(path.join(outputDir, 'summary.md'), markdownContent);
    fs.writeFileSync(path.join(outputDir, 'summary.xml'), xmlContent);
    
    console.log('Fallback summary files created.');
  } catch (fsError) {
    console.error('Error creating fallback summary files:', fsError);
  }
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 