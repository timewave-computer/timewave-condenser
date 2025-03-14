import fs from 'fs';
import path from 'path';

// Import the functions we want to test
import { loadTOMLConfig, getSystemPrompt, extractMarkdownSummary, extractXMLSummary } from '../utils';

// Mock the args object to avoid process.exit calls
jest.mock('../summarize', () => {
  const originalModule = jest.requireActual('../summarize');
  return {
    ...originalModule,
    args: {
      systemPrompt: 'Default prompt for testing',
      verbose: false
    }
  };
});

describe('TOML Configuration', () => {
  test('loadTOMLConfig should load and parse a TOML file', () => {
    const configPath = path.join(__dirname, 'data', 'test-config.toml');
    const config = loadTOMLConfig(configPath);
    
    expect(config).not.toBeNull();
    expect(config?.general.project_name).toBe('Sample Project');
    expect(config?.areas.core).toBeDefined();
    expect(config?.areas.api).toBeDefined();
    expect(config?.areas.utils).toBeDefined();
  });
  
  test('loadTOMLConfig should return null for non-existent file', () => {
    const configPath = path.join(__dirname, 'data', 'non-existent.toml');
    const config = loadTOMLConfig(configPath);
    
    expect(config).toBeNull();
  });
  
  test('getSystemPrompt should return area-specific prompt when available', () => {
    const configPath = path.join(__dirname, 'data', 'test-config.toml');
    const config = loadTOMLConfig(configPath);
    
    const prompt = getSystemPrompt(config, 'api', '');
    expect(prompt).toContain('Analyze this API code');
  });
  
  test('getSystemPrompt should return default prompt when area not found', () => {
    const configPath = path.join(__dirname, 'data', 'test-config.toml');
    const config = loadTOMLConfig(configPath);
    
    const prompt = getSystemPrompt(config, 'non-existent-area', '');
    expect(prompt).toBe(config?.general.default_prompt);
  });
});

describe('Response Parsing', () => {
  test('extractMarkdownSummary should extract markdown from code blocks', () => {
    const response = `Here's a summary:

\`\`\`markdown
# Project Summary

This is a test project.
\`\`\`

And here's the XML:`;
    
    const markdown = extractMarkdownSummary(response);
    expect(markdown).toBe('# Project Summary\n\nThis is a test project.');
  });
  
  test('extractMarkdownSummary should extract markdown without code blocks', () => {
    const response = `# Project Summary

This is a test project.

<?xml version="1.0"?>
<summary>
  <project>Test</project>
</summary>`;
    
    const markdown = extractMarkdownSummary(response);
    expect(markdown).toBe('# Project Summary\n\nThis is a test project.');
  });
  
  test('extractXMLSummary should extract XML from code blocks', () => {
    const response = `Here's the XML summary:

\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<summary>
  <project>Test</project>
</summary>
\`\`\``;
    
    const xml = extractXMLSummary(response);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<project>Test</project>');
  });
  
  test('extractXMLSummary should extract XML without code blocks', () => {
    const response = `Here's the XML summary:

<?xml version="1.0" encoding="UTF-8"?>
<summary>
  <project>Test</project>
</summary>`;
    
    const xml = extractXMLSummary(response);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<project>Test</project>');
  });
  
  test('extractXMLSummary should add XML declaration if missing', () => {
    const response = `Here's the XML summary:

\`\`\`xml
<summary>
  <project>Test</project>
</summary>
\`\`\``;
    
    const xml = extractXMLSummary(response);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<project>Test</project>');
  });
  
  test('extractXMLSummary should create fallback XML if no XML found', () => {
    const response = `Here's a summary without XML:

# Project Summary

This is a test project.`;
    
    const xml = extractXMLSummary(response);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<error>');
  });
}); 