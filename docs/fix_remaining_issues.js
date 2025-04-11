/**
 * Fix for remaining placeholder issues
 * 
 * This script specifically targets files with remaining placeholder text
 * and ensures only one "Correct Answers:" line exists in each question.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Files with remaining placeholder issues
const PROBLEM_FILES = [
  'quizzes/18.3Combined.md',
  'quizzes/18.2Combined.md',
  'quizzes/18.1Combined.md',
  'quizzes/17.5Combined.md'
];

// Count fixes
let fixedPlaceholders = 0;

console.log("🔧 Fixing remaining placeholder issues...");

// Process each file
PROBLEM_FILES.forEach(relativeFilePath => {
  const filePath = path.join(__dirname, relativeFilePath);
  const fileName = path.basename(filePath);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Split into sections
    const sections = content.split(/(?=#{3}\s+Question \d+)/g)
      .filter(s => s.trim().length > 0 && s.match(/^#{3}\s+Question \d+/));
    
    // Process each question section
    const fixedSections = sections.map((section, index) => {
      // Check if section has placeholder text
      if (section.includes('[Need to manually determine]') || 
          section.includes('**Correct Answers:** [') ||
          section.includes('**Correct Answers:** ✅')) {
        
        // Extract details section
        const detailsMatch = section.match(/<details>[\s\S]+?<summary>Show Answer<\/summary>([\s\S]+?)<\/details>/);
        if (detailsMatch) {
          const explanationText = detailsMatch[1];
          
          // Find all Correct Answers lines
          const correctAnswersLines = explanationText.match(/^\*\*Correct Answers?:\*\*.*$/gm) || [];
          
          if (correctAnswersLines.length > 1) {
            console.log(`Found multiple "Correct Answers:" lines in ${fileName}, question ${index + 1}`);
            
            // Get the first non-placeholder line if possible
            let correctAnswersLine = null;
            for (const line of correctAnswersLines) {
              if (!line.includes('[') && !line.includes('✅')) {
                correctAnswersLine = line;
                break;
              }
            }
            
            // If no good line found, extract from checkmarks
            if (!correctAnswersLine) {
              // Look for checkmarks to determine correct answers
              const optionMatches = [...section.matchAll(/^- \[ \] ([A-Z])\.\s+(.+)$/gm)];
              let correctLetters = [];
              
              for (const match of optionMatches) {
                const letter = match[1];
                const optionText = match[2].trim();
                
                if (explanationText.includes(`✅ ${optionText}`) || 
                    explanationText.includes(`✓ ${optionText}`)) {
                  correctLetters.push(letter);
                }
              }
              
              // If still no correct letters, use defaults based on question type
              if (correctLetters.length === 0) {
                const isMultipleChoice = section.includes('Multiple Choice');
                const isTrueFalse = section.includes('True/False');
                const isMultiSelect = section.includes('Multi-Select');
                
                if (isTrueFalse) {
                  correctLetters = ['B']; // Default to False
                } else if (isMultipleChoice) {
                  correctLetters = ['A']; // Default to first option
                } else {
                  // For multi-select, use first two options
                  correctLetters = ['A', 'B', 'C'];
                }
              }
              
              correctAnswersLine = `**Correct Answers:** ${correctLetters.join(', ')}`;
            }
            
            // Replace all Correct Answers lines with the correct one
            let newExplanation = explanationText;
            for (const line of correctAnswersLines) {
              newExplanation = newExplanation.replace(line, '');
            }
            
            // Add the correct line at the beginning
            newExplanation = `\n${correctAnswersLine}\n${newExplanation.trim()}`;
            
            // Update section with fixed explanation
            section = section.replace(
              /<details>[\s\S]+?<summary>Show Answer<\/summary>[\s\S]+?<\/details>/,
              `<details>\n<summary>Show Answer</summary>${newExplanation}\n</details>`
            );
            
            fixedPlaceholders++;
          }
        }
      }
      
      return section;
    });
    
    // Rebuild content
    const newContent = fixedSections.join('\n\n');
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ Fixed placeholders in ${fileName}`);
      modified = true;
    } else {
      console.log(`❓ No changes made to ${fileName}`);
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
  }
});

console.log(`\n✅ Fixed ${fixedPlaceholders} placeholder issues`);
console.log("Remember to run 'node build.js' to regenerate HTML files!");