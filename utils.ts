import fs from 'fs';
import * as TOML from '@iarna/toml';
import path from 'path';
import axios from 'axios';
import { globSync } from 'glob';

// Type definitions for configuration
export interface GeneralConfig {
  project_name: string;
  default_prompt: string;
}

export interface AreaConfig {
  description: string;
  included_paths: string[];
  excluded_paths: string[];
  prompt: string;
}

export interface TOMLConfig {
  general: GeneralConfig;
  areas: Record<string, AreaConfig>;
}

export interface SummaryOutput {
  markdown: string;
  xml: string;
}

export interface CategorySuggestion {
  path: string;
  category: string;
  confidence: number;  // 0.0 to 1.0
  reasoning: string;
}

/**
 * Load and parse TOML configuration file
 * @param configPath Path to the TOML configuration file
 * @param verbose Whether to log verbose messages
 * @returns Parsed configuration or null if file doesn't exist
 */
export function loadTOMLConfig(configPath: string, verbose: boolean = false): TOMLConfig | null {
  try {
    if (!fs.existsSync(configPath)) {
      if (verbose) {
        console.log(`Configuration file not found at ${configPath}`);
      }
      return null;
    }
    
    const configContent = fs.readFileSync(configPath, 'utf8');
    return TOML.parse(configContent) as unknown as TOMLConfig;
  } catch (error) {
    console.error(`Error parsing TOML configuration: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Get system prompt from config or fall back to default
 * @param config TOML configuration
 * @param areaName Area name to get prompt for
 * @param defaultPrompt Default prompt to use if no config or area found
 * @returns System prompt string
 */
export function getSystemPrompt(config: TOMLConfig | null, areaName?: string, defaultPrompt: string = ''): string {
  // If no config or specified prompt, use the provided prompt
  if (!config || !areaName) {
    return defaultPrompt;
  }
  
  // Get area-specific prompt or fall back to default
  if (config.areas[areaName]) {
    return config.areas[areaName].prompt;
  }
  
  return config.general.default_prompt;
}

/**
 * Identify files and directories not covered by existing configuration
 * @param repoPath Path to the repository root
 * @param config TOML configuration
 * @returns Array of uncategorized files and directories
 */
export function findUncategorizedPaths(repoPath: string, config: TOMLConfig): string[] {
  // Get all files and directories in the repository (excluding common ignore patterns)
  const allFiles = globSync('**/*', { 
    cwd: repoPath, 
    ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
    dot: false,
    nodir: false
  });
  
  // Files and directories already covered by existing categories
  const categorizedPaths = new Set<string>();
  
  // Check each area's included and excluded paths
  for (const area of Object.values(config.areas)) {
    // Add included paths to categorized set
    for (const includePath of area.included_paths) {
      // Convert glob patterns to files/directories
      const matchedPaths = globSync(includePath, { 
        cwd: repoPath, 
        ignore: area.excluded_paths,
        dot: false,
        nodir: false
      });
      
      // Add each matched path to the categorized set
      for (const matchedPath of matchedPaths) {
        categorizedPaths.add(matchedPath);
      }
    }
  }
  
  // Find paths that aren't categorized yet
  return allFiles.filter(filePath => !categorizedPaths.has(filePath));
}

/**
 * Automatically categorize uncategorized files and directories using AI
 * @param repoPath Path to the repository root
 * @param configPath Path to the TOML configuration file
 * @param apiKey API key for the AI service
 * @param provider Provider to use ('claude' or 'openai')
 * @param confidenceThreshold Minimum confidence score to auto-apply (0.0 to 1.0)
 * @param verbose Whether to log verbose messages
 * @returns Updated configuration object
 */
export async function categorizePaths(
  repoPath: string, 
  configPath: string,
  apiKey: string,
  provider: 'claude' | 'openai' = 'claude',
  confidenceThreshold: number = 0.8,
  verbose: boolean = false
): Promise<{ config: TOMLConfig, suggestions: CategorySuggestion[] }> {
  // Load the existing configuration
  const config = loadTOMLConfig(configPath, verbose);
  if (!config) {
    throw new Error(`Could not load configuration from ${configPath}`);
  }
  
  // Find uncategorized paths
  const uncategorizedPaths = findUncategorizedPaths(repoPath, config);
  if (uncategorizedPaths.length === 0) {
    if (verbose) {
      console.log('No uncategorized paths found. Configuration is up to date.');
    }
    return { config, suggestions: [] };
  }
  
  if (verbose) {
    console.log(`Found ${uncategorizedPaths.length} uncategorized paths.`);
  }
  
  // Prepare for AI categorization
  const sampleFilesContent = new Map<string, string>();
  
  // Get content of sample files for context (limit to 10 files max)
  const filesToSample = uncategorizedPaths
    .filter(p => fs.existsSync(path.join(repoPath, p)) && fs.statSync(path.join(repoPath, p)).isFile())
    .filter(p => {
      // Only include text files that are likely source code
      const ext = path.extname(p).toLowerCase();
      return ['.ts', '.js', '.tsx', '.jsx', '.py', '.rb', '.java', '.go', '.rs', 
              '.php', '.cs', '.cpp', '.c', '.h', '.swift', '.kt', '.md', '.txt'].includes(ext);
    })
    .slice(0, 10);
  
  for (const filePath of filesToSample) {
    try {
      const content = fs.readFileSync(path.join(repoPath, filePath), 'utf8');
      
      // Limit content to first 50 lines to avoid token limits
      const lines = content.split('\n').slice(0, 50).join('\n');
      sampleFilesContent.set(filePath, lines);
    } catch (error) {
      if (verbose) {
        console.warn(`Could not read ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  
  // Get existing area definitions for context
  const areaDefinitions = Object.entries(config.areas).map(([name, area]) => {
    return {
      name,
      description: area.description,
      included_paths: area.included_paths,
      excluded_paths: area.excluded_paths
    };
  });
  
  // Build AI prompt
  let prompt = `You are an expert software architect tasked with organizing a codebase into logical areas.

Below is the current configuration of areas in a software project:

${JSON.stringify(areaDefinitions, null, 2)}

I've found the following files and directories that are not yet categorized:

${uncategorizedPaths.join('\n')}

${sampleFilesContent.size > 0 ? `Here's some sample content from a few of these files for context:

${Array.from(sampleFilesContent.entries()).map(([file, content]) => `--- ${file} ---
${content}
`).join('\n')}` : ''}

Please analyze these paths and categorize each one into the most appropriate existing area.
For each path, provide:
1. The recommended area name (must be one of the existing areas)
2. A confidence score from 0.0 to 1.0 (where 1.0 is absolute certainty)
3. Brief reasoning for your recommendation

Format your response as a JSON array of objects with these fields:
- path: the file or directory path
- category: the recommended area name
- confidence: your confidence score (0.0-1.0)
- reasoning: brief explanation for this categorization

Respond ONLY with valid JSON that I can parse programmatically.`;

  let aiResponse;
  
  // Get AI response based on provider
  if (provider === 'claude') {
    aiResponse = await getCategoriesFromClaude(prompt, apiKey);
  } else { // openai
    aiResponse = await getCategoriesFromOpenAI(prompt, apiKey);
  }
  
  if (verbose) {
    console.log(`Received ${aiResponse.length} categorization suggestions from AI.`);
  }
  
  // Apply high-confidence suggestions to the configuration
  const updatedConfig = { ...config };
  
  for (const suggestion of aiResponse) {
    if (suggestion.confidence >= confidenceThreshold && updatedConfig.areas[suggestion.category]) {
      // Add the path to the appropriate area's included_paths
      if (!updatedConfig.areas[suggestion.category].included_paths.includes(suggestion.path)) {
        updatedConfig.areas[suggestion.category].included_paths.push(suggestion.path);
        
        if (verbose) {
          console.log(`Auto-categorized: ${suggestion.path} → ${suggestion.category} (confidence: ${suggestion.confidence})`);
        }
      }
    } else if (verbose) {
      console.log(`Low confidence suggestion: ${suggestion.path} → ${suggestion.category} (confidence: ${suggestion.confidence})`);
    }
  }
  
  // Save the updated configuration
  const updatedToml = TOML.stringify(updatedConfig as any);
  fs.writeFileSync(configPath, updatedToml);
  
  if (verbose) {
    console.log(`Updated configuration saved to ${configPath}`);
  }
  
  return { config: updatedConfig, suggestions: aiResponse };
}

/**
 * Get categorization suggestions from Claude API
 * @param prompt The prompt to send to Claude
 * @param apiKey Anthropic API key
 * @returns Array of category suggestions
 */
async function getCategoriesFromClaude(prompt: string, apiKey: string): Promise<CategorySuggestion[]> {
  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-haiku-20240307',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': apiKey
        }
      }
    );
    
    // Extract JSON from the response
    const content = response.data.content[0].text;
    
    // Find JSON in the response (it might be wrapped in markdown code blocks)
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                      content.match(/```\n([\s\S]*?)\n```/) || 
                      [null, content];
                      
    const jsonContent = jsonMatch ? jsonMatch[1] : content;
    
    // Parse the JSON
    return JSON.parse(jsonContent) as CategorySuggestion[];
  } catch (error) {
    console.error('Error getting categories from Claude:', error);
    return [];
  }
}

/**
 * Get categorization suggestions from OpenAI API
 * @param prompt The prompt to send to OpenAI
 * @param apiKey OpenAI API key
 * @returns Array of category suggestions
 */
async function getCategoriesFromOpenAI(prompt: string, apiKey: string): Promise<CategorySuggestion[]> {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        max_tokens: 4000,
        messages: [
          {
            role: 'system',
            content: 'You are an expert software architect specializing in codebase organization.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    // Extract JSON from the response
    const content = response.data.choices[0].message.content;
    
    // Find JSON in the response (it might be wrapped in markdown code blocks)
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                      content.match(/```\n([\s\S]*?)\n```/) || 
                      [null, content];
                      
    const jsonContent = jsonMatch ? jsonMatch[1] : content;
    
    // Parse the JSON
    return JSON.parse(jsonContent) as CategorySuggestion[];
  } catch (error) {
    console.error('Error getting categories from OpenAI:', error);
    return [];
  }
}

/**
 * Extract markdown summary from AI response text
 * @param text AI response text
 * @returns Extracted markdown summary
 */
export function extractMarkdownSummary(text: string): string {
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
export function extractXMLSummary(text: string): string {
  try {
    // Look for XML inside code blocks first
    const xmlCodeBlockMatch = text.match(/```xml\s+([\s\S]+?)\s+```/);
    let xml = xmlCodeBlockMatch ? xmlCodeBlockMatch[1] : '';
    
    // If no XML in code blocks, look for XML structure directly
    if (!xml) {
      const xmlMatch = text.match(/<\?xml[\s\S]+?<\/summary>/);
      if (xmlMatch) {
        xml = xmlMatch[0];
      }
    }
    
    // If no XML found, look for any XML-like structure
    if (!xml) {
      const fallbackMatch = text.match(/<summary>[\s\S]+?<\/summary>/);
      if (fallbackMatch) {
        xml = `<?xml version="1.0" encoding="UTF-8"?>\n${fallbackMatch[0]}`;
      }
    }
    
    // If still no XML, create a fallback
    if (!xml) {
      xml = `<?xml version="1.0" encoding="UTF-8"?>
<summary>
  <e>No XML summary was found in the response. Please try again.</e>
</summary>`;
    }
    
    // Ensure XML declaration is present
    if (!xml.includes('<?xml')) {
      xml = `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
    }
    
    return xml;
  } catch (error) {
    // Return a fallback XML in case of any error
    return `<?xml version="1.0" encoding="UTF-8"?>
<summary>
  <e>An error occurred while extracting the XML summary.</e>
  <details>${error instanceof Error ? error.message : String(error)}</details>
</summary>`;
  }
}

/**
 * Generate fallback summary files when API request fails
 * @param outputDir Output directory
 * @param error Error object
 */
export function generateFallbackSummaries(outputDir: string, error: any): void {
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
    
    // Create fallback XML summary with proper error tags
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<summary>
  <e>
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
  </e>
</summary>`;
    
    try {
      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Write fallback files
      fs.writeFileSync(path.join(outputDir, 'summary.md'), markdownContent);
      fs.writeFileSync(path.join(outputDir, 'summary.xml'), xmlContent);
      
      console.log('Fallback summary files created.');
    } catch (fsError) {
      console.error('Error writing fallback summary files:', fsError);
    }
  } catch (fsError) {
    console.error('Error creating fallback summary files:', fsError);
  }
} 