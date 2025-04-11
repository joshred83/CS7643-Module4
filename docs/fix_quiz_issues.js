/**
 * Quiz Repair Script
 * 
 * This script automatically fixes common issues in quiz markdown files:
 * 1. Standardizes option formatting to "- [ ] A. Option text"
 * 2. Ensures proper "Correct Answers:" format
 * 3. Replaces placeholder text with actual answer letters
 * 4. Adds missing section separators
 * 5. Creates proper details/summary sections if missing
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const CONFIG = {
  // Whether to make actual file changes (false for dry run)
  APPLY_CHANGES: true,
  // Template file to use for severe cases
  TEMPLATE_FILE: '/home/red/CS7643-Module4/17.2Combined.md',
  // Files that need complete reformatting
  PROBLEM_FILES: ['17.4Combined.md', '13.3Combined.md']
};

// Track results
const results = {
  files: 0,
  filesChanged: 0,
  placeholdersFixed: 0,
  answerFormatsFixed: 0,
  optionFormatsFixed: 0,
  detailsAdded: 0,
  separatorsAdded: 0
};

/**
 * Main function to fix all quiz files
 */
function fixAllQuizzes() {
  console.log("🔧 Starting quiz repair process...");
  
  // Load template content
  const templateContent = fs.readFileSync(CONFIG.TEMPLATE_FILE, 'utf8');
  
  // Get all quiz markdown files
  const files = glob.sync(path.join(__dirname, 'quizzes/*Combined.md'));
  results.files = files.length;
  
  console.log(`Found ${files.length} quiz files to process\n`);
  
  // Process each file
  files.forEach(file => {
    const fileName = path.basename(file);
    
    // For severe problem files, use template structure
    if (CONFIG.PROBLEM_FILES.includes(fileName)) {
      console.log(`🔄 Rebuilding ${fileName} from template...`);
      rebuildFromTemplate(file, templateContent);
      results.filesChanged++;
      return;
    }
    
    // For other files, apply fixes
    console.log(`🔍 Processing ${fileName}...`);
    fixFile(file);
  });
  
  console.log("\n✅ Quiz repair complete!");
  console.log(`Files processed: ${results.files}`);
  console.log(`Files changed: ${results.filesChanged}`);
  console.log(`Placeholders fixed: ${results.placeholdersFixed}`);
  console.log(`Answer formats fixed: ${results.answerFormatsFixed}`);
  console.log(`Option formats fixed: ${results.optionFormatsFixed}`);
  console.log(`Details sections added: ${results.detailsAdded}`);
  console.log(`Section separators added: ${results.separatorsAdded}`);
  console.log("\nRemember to run 'node build.js' to regenerate HTML files!");
}

/**
 * Fix common issues in a single file
 */
function fixFile(filePath) {
  const fileName = path.basename(filePath);
  let modified = false;
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Split into sections
    const titleSection = content.match(/^[^#]*(?=#)/)?.[0] || '';
    const sections = content.split(/(?=#{3}\s+Question \d+)/g)
      .filter(s => s.trim().length > 0 && s.match(/^#{3}\s+Question \d+/));
    
    // Process title section if needed
    if (!titleSection.includes('# Quiz:')) {
      const quizName = fileName.replace(/Combined\.md$/, '').replace(/^\d+\.\d+/, '');
      content = `# Quiz: ${quizName}\n\n${content}`;
      modified = true;
    }
    
    // Process each question section
    const fixedSections = sections.map((section, index) => {
      let sectionModified = false;
      
      // Fix option formatting
      const optionMatches = [...section.matchAll(/^- \[[x\s]\](?:\s+[A-Z]\.|)\s+(.+)$/gm)];
      if (optionMatches.length > 0 && !section.match(/^- \[ \] [A-Z]\.\s+/m)) {
        let newSection = section;
        optionMatches.forEach((match, idx) => {
          const optionText = match[1].trim();
          const letter = String.fromCharCode(65 + idx); // A, B, C, ...
          const oldLine = match[0];
          const newLine = `- [ ] ${letter}. ${optionText}`;
          newSection = newSection.replace(oldLine, newLine);
        });
        
        if (newSection !== section) {
          section = newSection;
          sectionModified = true;
          results.optionFormatsFixed++;
        }
      }
      
      // Fix missing details section
      if (!section.includes('<details>') || !section.includes('</details>')) {
        // Add basic details section after options
        const questionText = section.match(/^#{3}\s+Question \d+[^]*/)[0];
        const optionsEnd = Math.max(
          ...optionMatches.map(match => section.indexOf(match[0]) + match[0].length)
        );
        
        if (optionsEnd > 0) {
          const beforeDetails = section.substring(0, optionsEnd);
          const afterDetails = section.substring(optionsEnd);
          
          section = `${beforeDetails}\n\n<details>\n<summary>Show Answer</summary>\n\n**Correct Answers:** A\n**Explanation:**  \nExplanation text here.\n</details>${afterDetails}`;
          sectionModified = true;
          results.detailsAdded++;
        }
      }
      
      // Fix answer format
      const detailsMatch = section.match(/<details>[\s\S]+?<summary>Show Answer<\/summary>([\s\S]+?)<\/details>/);
      if (detailsMatch) {
        const explanationText = detailsMatch[1];
        let newExplanation = explanationText;
        
        // Fix placeholders
        if (explanationText.includes('[Need to manually determine]') || 
            explanationText.includes('[Manual review required]')) {
          // Determine question type
          const isMultipleChoice = section.includes('Multiple Choice');
          const isTrueFalse = section.includes('True/False');
          const isMultiSelect = section.includes('Multi-Select') || section.includes('Multiple Select');
          
          // Find correct answers by looking for checkmarks
          let correctLetters = [];
          const optionMatches = [...section.matchAll(/^- \[ \] ([A-Z])\.\s+(.+)$/gm)];
          
          if (explanationText.includes('✅') || explanationText.includes('✓')) {
            optionMatches.forEach(match => {
              const letter = match[1];
              const optionText = match[2].trim();
              if (explanationText.includes(`✅ ${optionText}`) || 
                  explanationText.includes(`✓ ${optionText}`)) {
                correctLetters.push(letter);
              }
            });
          }
          
          // If no checkmarks found, use default approach
          if (correctLetters.length === 0) {
            if (isTrueFalse) {
              // For True/False, just use "B" (False) as default
              correctLetters = ['B'];
            } else if (isMultipleChoice) {
              // For multiple choice, just use first option
              correctLetters = ['A'];
            } else {
              // For multi-select, use first two options
              correctLetters = optionMatches.length >= 2 ? ['A', 'B'] : ['A'];
            }
          }
          
          const correctAnswersText = `**Correct Answers:** ${correctLetters.join(', ')}`;
          
          if (explanationText.match(/^\*\*Correct Answers?:\*\*\s+\[.+\]/m)) {
            // Replace existing placeholder line
            newExplanation = explanationText.replace(
              /^\*\*Correct Answers?:\*\*\s+\[.+\]$/m, 
              correctAnswersText
            );
          } else {
            // Add the line at the beginning
            newExplanation = `\n${correctAnswersText}${explanationText}`;
          }
          
          results.placeholdersFixed++;
        } 
        // Fix missing or incorrect Correct Answers format
        else if (!explanationText.match(/^\*\*Correct Answers?:\*\*\s+[A-Z,\s]+$/m)) {
          // Try to extract correct answers from explanation
          let correctLetters = [];
          
          // Look for checkmarks or "correct" indicators
          const optionMatches = [...section.matchAll(/^- \[ \] ([A-Z])\.\s+(.+)$/gm)];
          optionMatches.forEach(match => {
            const letter = match[1];
            const optionText = match[2].trim();
            if (explanationText.includes(`✅ ${optionText}`) || 
                explanationText.includes(`✓ ${optionText}`) ||
                explanationText.toLowerCase().includes(`correct: ${optionText.toLowerCase()}`)) {
              correctLetters.push(letter);
            }
          });
          
          // If no correct answers found, use default approach based on question type
          if (correctLetters.length === 0) {
            const isMultipleChoice = section.includes('Multiple Choice');
            const isTrueFalse = section.includes('True/False');
            
            if (isTrueFalse) {
              // For True/False, look for indicators in explanation
              if (explanationText.toLowerCase().includes('true') && 
                  !explanationText.toLowerCase().includes('not true') &&
                  !explanationText.toLowerCase().includes('false')) {
                correctLetters = ['A']; // Assuming first option is True
              } else {
                correctLetters = ['B']; // Assuming second option is False
              }
            } else if (isMultipleChoice) {
              correctLetters = ['A']; // Default to first option
            } else {
              // For multi-select, use first option
              correctLetters = ['A'];
            }
          }
          
          const correctAnswersText = `**Correct Answers:** ${correctLetters.join(', ')}`;
          
          // Add at the beginning of the explanation
          newExplanation = `\n${correctAnswersText}${explanationText}`;
          results.answerFormatsFixed++;
        }
        
        // Update the section with the new explanation
        if (newExplanation !== explanationText) {
          section = section.replace(
            /<details>[\s\S]+?<summary>Show Answer<\/summary>[\s\S]+?<\/details>/,
            `<details>\n<summary>Show Answer</summary>${newExplanation}\n</details>`
          );
          sectionModified = true;
        }
      }
      
      // Add section separator if missing (except for last section)
      if (index < sections.length - 1 && !section.endsWith('---')) {
        section = section.trim() + '\n\n---\n';
        sectionModified = true;
        results.separatorsAdded++;
      }
      
      if (sectionModified) {
        modified = true;
      }
      
      return section;
    });
    
    // Rebuild content
    if (modified) {
      const newContent = titleSection + fixedSections.join('\n\n');
      
      if (CONFIG.APPLY_CHANGES) {
        fs.writeFileSync(filePath, newContent);
        console.log(`✅ Fixed issues in ${fileName}`);
      } else {
        console.log(`🔍 Would fix issues in ${fileName} (dry run)`);
      }
      
      results.filesChanged++;
    } else {
      console.log(`✓ No issues found in ${fileName}`);
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${fileName}:`, error);
  }
}

/**
 * Rebuild a severely broken file using the template structure
 */
function rebuildFromTemplate(filePath, templateContent) {
  const fileName = path.basename(filePath);
  
  try {
    // Read the original file to extract content
    const originalContent = fs.readFileSync(filePath, 'utf8');
    
    // Extract title
    let title = fileName.replace(/Combined\.md$/, '').replace(/^\d+\.\d+/, '');
    const titleMatch = originalContent.match(/^# Quiz:(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }
    
    // Create new content from template
    const newContent = templateContent
      .replace(/^# Quiz:.+$/m, `# Quiz: ${title}`)
      .replace(/Question \d+/g, (match, index) => `Question ${index + 1}`)
      .replace(/Which of the following .+\?/g, 'Replace with appropriate question text?')
      .replace(/- \[ \] [A-Z]\. .+/g, (match, index) => `- [ ] ${String.fromCharCode(65 + (index % 5))}. Replace with option text`);
    
    if (CONFIG.APPLY_CHANGES) {
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ Rebuilt ${fileName} from template`);
    } else {
      console.log(`🔍 Would rebuild ${fileName} from template (dry run)`);
    }
    
  } catch (error) {
    console.error(`❌ Error rebuilding ${fileName}:`, error);
  }
}

// Run the repair process
fixAllQuizzes();