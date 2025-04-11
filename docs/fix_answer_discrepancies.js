/**
 * Script to fix discrepancies between correct answers and explanations
 * 
 * This script:
 * 1. Identifies questions where explanation mentions options as correct but they're not in "Correct Answers:" line
 * 2. Updates the "Correct Answers:" line to include all correct options mentioned in the explanation
 * 3. Removes duplicate "Correct Answers:" lines
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Get all quiz markdown files
const files = glob.sync(path.join(__dirname, 'quizzes', '*Combined.md'));
console.log(`Found ${files.length} Combined.md files to fix`);

let totalFixed = 0;
let totalDuplicatesRemoved = 0;

// Process each file
files.forEach(file => {
  const fileName = path.basename(file);
  console.log(`Processing ${fileName}...`);
  
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;
  let fixedInFile = 0;
  let duplicatesRemovedInFile = 0;

  // Split into sections by questions
  const questionSections = content.split(/(?=### Question \d+)/g);
  
  // Process each question section
  const processedSections = questionSections.map(section => {
    // Check if section has a question
    if (!section.match(/^### Question \d+/)) {
      return section;
    }
    
    // Extract question info
    const questionMatch = section.match(/^### Question (\d+)\s*\(([^)]+)\)/);
    if (!questionMatch) {
      return section;
    }
    
    const questionNumber = questionMatch[1];
    const questionType = questionMatch[2];
    
    // Check for details section
    const detailsMatch = section.match(/<details>[\s\S]+?<\/details>/);
    if (!detailsMatch) {
      return section;
    }
    
    let detailsContent = detailsMatch[0];
    
    // Extract explanation content
    const explanationMatch = detailsContent.match(/<summary>Show Answer<\/summary>([\s\S]+?)<\/details>/);
    if (!explanationMatch) {
      return section;
    }
    
    let explanationContent = explanationMatch[1];
    
    // Get correct answer letters from first "Correct Answers:" line
    const correctAnswersMatch = explanationContent.match(/\*\*Correct Answers?:\*\*\s*([A-Z,\s]+)/i);
    if (!correctAnswersMatch) {
      return section;
    }
    
    let correctLetters = correctAnswersMatch[1]
      .split(/[,\s]+/)
      .filter(letter => /^[A-Z]$/i.test(letter))
      .map(letter => letter.toUpperCase());
    
    // Count "Correct Answers:" lines
    const correctAnswersLines = explanationContent.match(/\*\*Correct Answers?:\*\*/g);
    if (correctAnswersLines && correctAnswersLines.length > 1) {
      duplicatesRemovedInFile++;
      totalDuplicatesRemoved++;
    }
    
    // Extract options with their letters
    const optionMatches = [...section.matchAll(/- \[ \] ([A-Z])\.\s+(.+)/g)];
    const options = optionMatches.map(match => ({ 
      letter: match[1],
      text: match[2].trim()
    }));
    
    // Check explanation text for mentions of options being correct
    const explicitlyMentionedCorrect = [];
    const explanationText = explanationContent.replace(/\*\*Correct Answers?:\*\*\s*[A-Z,\s]+/g, '');
    
    // Look for patterns like "options A, B, and C are correct" or "(A) is correct" 
    options.forEach(option => {
      // Check for mentions of this option being correct
      const letterPatterns = [
        new RegExp(`\\(${option.letter}\\)[^\.]*correct`, 'i'),
        new RegExp(`option ${option.letter}[^\.]*correct`, 'i'),
        new RegExp(`${option.letter}\\)[^\.]*correct`, 'i'),
        new RegExp(`\\b${option.letter}\\b[^\.]*correct`, 'i')
      ];
      
      // Check if explanation specifically mentions this option by text
      const contentPatterns = [
        new RegExp(`${escapeRegExp(option.text)}[^\.]*correct`, 'i')
      ];
      
      // For multiple choice and multi-select questions, also check for patterns in explanation
      if (questionType.toLowerCase().includes('multi')) {
        // Check for explicit mentions like "(A, B, C, E)"
        const multiOptionMatches = explanationText.match(/\(([A-Z,\s]+)\)/g);
        if (multiOptionMatches) {
          multiOptionMatches.forEach(match => {
            const letters = match.replace(/[()]]/g, '').split(/[,\s]+/).filter(l => /^[A-Z]$/i.test(l));
            if (letters.includes(option.letter)) {
              explicitlyMentionedCorrect.push(option.letter);
            }
          });
        }
      }
      
      // Check all patterns
      const isExplicitlyMentioned = 
        letterPatterns.some(pattern => pattern.test(explanationText)) ||
        contentPatterns.some(pattern => pattern.test(explanationText));
      
      if (isExplicitlyMentioned && !explicitlyMentionedCorrect.includes(option.letter)) {
        explicitlyMentionedCorrect.push(option.letter);
      }
    });
    
    // For true/false questions, special handling
    if (questionType.toLowerCase().includes('true/false')) {
      if (explanationText.toLowerCase().includes('true') && 
          !explanationText.toLowerCase().includes('not true') &&
          !explanationText.toLowerCase().includes('isn\'t true')) {
        explicitlyMentionedCorrect.push('A'); // True is usually A
      } else if (explanationText.toLowerCase().includes('false') && 
                !explanationText.toLowerCase().includes('not false') &&
                !explanationText.toLowerCase().includes('isn\'t false')) {
        explicitlyMentionedCorrect.push('B'); // False is usually B
      }
    }
    
    // Find missing correct letters (mentioned in explanation but not in "Correct Answers:")
    let missingCorrectLetters = explicitlyMentionedCorrect.filter(
      letter => !correctLetters.includes(letter)
    );
    
    // If more correct letters found in explanation, update the "Correct Answers:" line
    if (missingCorrectLetters.length > 0) {
      console.log(`  Question ${questionNumber}: Found ${missingCorrectLetters.length} additional correct options mentioned in explanation`);
      
      // Add missing letters to correct letters
      const newCorrectLetters = [...new Set([...correctLetters, ...missingCorrectLetters])].sort();
      
      // Create new "Correct Answers:" line
      const newCorrectAnswersLine = `**Correct Answers:** ${newCorrectLetters.join(', ')}`;
      
      // Replace in explanation (all instances)
      let newExplanation = explanationContent.replace(/\*\*Correct Answers?:\*\*\s*[^\n]*/g, '');
      
      // Add the updated correct answers line at the beginning
      newExplanation = `\n${newCorrectAnswersLine}\n${newExplanation.trim()}`;
      
      // Replace in section
      const newDetailsContent = detailsContent.replace(
        /<summary>Show Answer<\/summary>[\s\S]+?<\/details>/,
        `<summary>Show Answer</summary>${newExplanation}\n</details>`
      );
      
      section = section.replace(detailsContent, newDetailsContent);
      modified = true;
      fixedInFile++;
      totalFixed++;
    } 
    // If only duplicate "Correct Answers:" lines, fix those
    else if (correctAnswersLines && correctAnswersLines.length > 1) {
      // Remove all "Correct Answers:" lines
      let newExplanation = explanationContent.replace(/\*\*Correct Answers?:\*\*\s*[^\n]*/g, '');
      
      // Add back the correct one
      newExplanation = `\n**Correct Answers:** ${correctLetters.join(', ')}\n${newExplanation.trim()}`;
      
      // Replace in section
      const newDetailsContent = detailsContent.replace(
        /<summary>Show Answer<\/summary>[\s\S]+?<\/details>/,
        `<summary>Show Answer</summary>${newExplanation}\n</details>`
      );
      
      section = section.replace(detailsContent, newDetailsContent);
      modified = true;
    }
    
    return section;
  });
  
  // Join sections back together
  const newContent = processedSections.join('');
  
  // Write back if modified
  if (modified) {
    fs.writeFileSync(file, newContent);
    console.log(`  ✓ Fixed ${fixedInFile} questions and removed ${duplicatesRemovedInFile} duplicates in ${fileName}`);
  } else {
    console.log(`  ✓ No issues found in ${fileName}`);
  }
});

console.log(`\nFixed ${totalFixed} questions with discrepancies between answers and explanations`);
console.log(`Removed duplicate "Correct Answers:" lines in ${totalDuplicatesRemoved} questions`);
console.log("Don't forget to run 'node build.js' to rebuild HTML files!");

// Helper function to escape special regex characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}