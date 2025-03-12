const fs = require('fs');
const axios = require('axios');
const path = require('path');
const minimist = require('minimist');

// Parse arguments passed from the bash script
const args = minimist(process.argv.slice(2), {
  string: ['input', 'output', 'provider', 'systemPrompt', 'apiKey'],
  number: ['maxTokens'],
  default: {
    provider: 'claude',
    maxTokens: 4000,
    systemPrompt: ''
  }
});

// Configure API settings based on provider
const providers = {
  claude: {
    url: 'https://api.anthropic.com/v1/messages',
    headers: apiKey => ({
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': apiKey
    }),
    formatRequest: (content, systemPrompt, maxTokens) => ({
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
    parseResponse: response => ({
      markdown: extractMarkdownSummary(response.content[0].text),
      xml: extractXMLSummary(response.content[0].text)
    })
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    headers: apiKey => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }),
    formatRequest: (content, systemPrompt, maxTokens) => ({
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
    parseResponse: response => ({
      markdown: extractMarkdownSummary(response.choices[0].message.content),
      xml: extractXMLSummary(response.choices[0].message.content)
    })
  }
};

// Helpers for extracting sections from AI response
function extractMarkdownSummary(text) {
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
}

function extractXMLSummary(text) {
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
  <raw_response>${text.replace(/[<>&'"]/g, c => {
    return {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      "'": '&apos;',
      '"': '&quot;'
    }[c];
  })}</raw_response>
</summary>`;
}

async function main() {
  try {
    // Validate input and output
    if (!args.input || !args.output) {
      console.error('Error: Input file and output directory are required');
      process.exit(1);
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
      console.error(`Error: No API key provided for ${args.provider}. Use --api-key or set ${args.provider.toUpperCase()}_API_KEY environment variable.`);
      process.exit(1);
    }
    
    // Read the input file
    console.log(`Reading input file: ${args.input}`);
    const content = fs.readFileSync(args.input, 'utf8');
    
    // Get provider configuration
    const provider = providers[args.provider];
    if (!provider) {
      console.error(`Error: Unsupported provider "${args.provider}". Supported providers: claude, openai`);
      process.exit(1);
    }
    
    // Prepare request
    console.log(`Sending request to ${args.provider.toUpperCase()} API...`);
    const requestData = provider.formatRequest(content, args.systemPrompt, args.maxTokens);
    
    // Make the API call
    const response = await axios.post(
      provider.url, 
      requestData,
      { headers: provider.headers(apiKey) }
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
  } catch (error) {
    console.error('Error generating summaries:');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error(`HTTP status: ${error.response.status}`);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from API');
    } else {
      // Something happened in setting up the request
      console.error('Error:', error.message);
    }
    
    process.exit(1);
  }
}

main(); 