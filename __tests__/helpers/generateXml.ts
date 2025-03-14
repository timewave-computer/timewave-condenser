import fs from 'fs';
import path from 'path';

/**
 * Generate an XML representation of a directory
 * @param dirPath Directory path
 * @param outputPath Output file path
 */
export function generateXml(dirPath: string, outputPath: string): void {
  const repoName = path.basename(dirPath);
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<codebase>\n`;
  xml += `  <repository name="${repoName}" path="${dirPath}">\n`;
  
  // Add some language information
  xml += `    <language name="TypeScript" percentage="85" />\n`;
  xml += `    <language name="JavaScript" percentage="10" />\n`;
  xml += `    <language name="JSON" percentage="5" />\n`;
  
  // Process all files
  const files = getAllFiles(dirPath);
  
  for (const file of files) {
    const relativePath = path.relative(dirPath, file);
    const content = fs.readFileSync(file, 'utf8');
    const fileType = getFileType(file);
    
    xml += `    <file path="${relativePath}">\n`;
    xml += `      <content type="${fileType}">\n`;
    xml += `        <![CDATA[\n${content}\n        ]]>\n`;
    xml += `      </content>\n`;
    xml += `    </file>\n`;
  }
  
  xml += `  </repository>\n`;
  xml += `</codebase>`;
  
  fs.writeFileSync(outputPath, xml);
  console.log(`XML generated at ${outputPath}`);
}

/**
 * Get all files in a directory recursively
 * @param dirPath Directory path
 * @returns Array of file paths
 */
function getAllFiles(dirPath: string): string[] {
  const files: string[] = [];
  
  function traverseDir(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and .git directories
        if (entry.name !== 'node_modules' && entry.name !== '.git') {
          traverseDir(fullPath);
        }
      } else {
        files.push(fullPath);
      }
    }
  }
  
  traverseDir(dirPath);
  return files;
}

/**
 * Get the file type based on extension
 * @param filePath File path
 * @returns File type
 */
function getFileType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.ts':
      return 'typescript';
    case '.js':
      return 'javascript';
    case '.json':
      return 'json';
    case '.md':
      return 'markdown';
    default:
      return 'text';
  }
}

// If this script is run directly
if (require.main === module) {
  const sampleRepoPath = path.join(__dirname, '..', 'sample-repo');
  const outputPath = path.join(__dirname, '..', 'data', 'sample-repo.xml');
  generateXml(sampleRepoPath, outputPath);
} 