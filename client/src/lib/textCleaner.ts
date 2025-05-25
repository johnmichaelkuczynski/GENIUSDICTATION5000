/**
 * Utility function to clean markdown formatting from text
 * This helps ensure transformed text is displayed without markdown symbols
 */
export function removeMarkdownFormatting(text: string): string {
  if (!text) return '';
  
  let cleanedText = text;
  
  // Remove bold formatting
  cleanedText = cleanedText.replace(/\*\*/g, '');
  
  // Remove italic formatting
  cleanedText = cleanedText.replace(/\*/g, '');
  
  // Remove headings (# Heading)
  cleanedText = cleanedText.replace(/#{1,6}\s/g, '');
  
  // Remove code blocks and inline code
  cleanedText = cleanedText.replace(/`{1,3}/g, '');
  
  // Remove block quotes
  cleanedText = cleanedText.replace(/>\s/g, '');
  
  // Remove horizontal rules
  cleanedText = cleanedText.replace(/---/g, '');
  cleanedText = cleanedText.replace(/___/g, '');
  
  // Convert links to just text
  cleanedText = cleanedText.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  
  return cleanedText;
}