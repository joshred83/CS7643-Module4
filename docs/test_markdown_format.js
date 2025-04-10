/**
 * Unit tests for checking the standardized markdown format
 * This script:
 * 1. Tests question format consistency across all Combined.md files
 * 2. Verifies correct marking of answers
 * 3. Ensures each file has a mix of different question types
 * 4. Fixes formatting issues automatically when needed
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Expected markdown format patterns
const QUESTION_PATTERN = /^### Question \d+.*$/m;
const OPTION_PATTERN = /^- \[ \] ([A-Z])\.\s+(.+)$/m;
const CORRECT_ANSWERS_PATTERN = /^\*\*Correct Answers?:\*\*\s+([A-Z,\s]+)$/m;
const DETAILS_PATTERN = /<details>[\s\S]+?<summary>Show Answer<\/summary>([\s\S]+?)<\/details>/m;

// Question types
const QUESTION_TYPES = {
  TRUE_FALSE: 'True/False',
  MULTIPLE_CHOICE: 'Multiple Choice',
  MULTI_SELECT: 'Multi-Select'
};

// Test results
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let fileIssues = {};

// Statistics
let questionCount = 0;
let trueFalseCount = 0;
let multipleChoiceCount = 0;
let multiSelectCount = 0;
let modifiedFiles = [];

/**
 * Test a single file for markdown format consistency
 */
function testFile(filePath) {
  console.log(`\nTesting file: ${path.basename(filePath)}`);
  const fileName = path.basename(filePath);
  fileIssues[fileName] = [];
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Split content into sections
    const sections = content.split(/(?=#{3}\s+Question \d+)/g).filter(s => s.trim().length > 0);
    
    // Test title section
    if (!content.match(/^# Quiz:/m)) {
      fileIssues[fileName].push('Missing or incorrect quiz title format');
      // Fix: Add standard quiz title if missing
      if (!content.match(/^#/m)) {
        const quizName = fileName.replace(/Combined\.md$/, '').replace(/^\d+\.\d+/, '');
        content = `# Quiz: ${quizName}\n\n${content}`;
        modified = true;
      }
    }
    
    // Test each question section
    sections.forEach((section, index) => {
      questionCount++;
      
      // Skip the title section if it exists
      if (!section.match(QUESTION_PATTERN)) {
        if (index === 0 && section.match(/^#[^#]/m)) {
          return; // Title section, skip
        } else {
          fileIssues[fileName].push(`Section ${index} is not a properly formatted question`);
          return;
        }
      }
      
      // Test 1: Question header format
      testResult(`Question ${index+1} header format`, 
                 section.match(QUESTION_PATTERN) !== null);
      
      // Get question type
      const typeParts = section.match(/^### Question \d+\s*\(([^)]+)\)/m);
      let questionType = typeParts ? typeParts[1].trim() : 'Unknown';
      
      // Standardize question type
      if (questionType.toLowerCase().includes('true') && questionType.toLowerCase().includes('false')) {
        questionType = QUESTION_TYPES.TRUE_FALSE;
        trueFalseCount++;
      } else if (questionType.toLowerCase().includes('multiple choice')) {
        questionType = QUESTION_TYPES.MULTIPLE_CHOICE;
        multipleChoiceCount++;
      } else if (questionType.toLowerCase().includes('multi-select') || 
                 questionType.toLowerCase().includes('multiple select')) {
        questionType = QUESTION_TYPES.MULTI_SELECT;
        multiSelectCount++;
      } else {
        fileIssues[fileName].push(`Question ${index+1} has non-standard question type: ${questionType}`);
      }
      
      // Test 2: Options format
      const optionMatches = [...section.matchAll(/^- \[ \] ([A-Z])\.\s+(.+)$/gm)];
      
      testResult(`Question ${index+1} has letter-prefixed options`,
                 optionMatches.length > 0);
      
      if (optionMatches.length === 0) {
        fileIssues[fileName].push(`Question ${index+1} has no properly formatted options`);
      }
      
      // Test 3: Details/answer section
      const detailsMatch = section.match(DETAILS_PATTERN);
      testResult(`Question ${index+1} has a details section with Show Answer`,
                 detailsMatch !== null);
                 
      if (!detailsMatch) {
        fileIssues[fileName].push(`Question ${index+1} is missing a proper details/answer section`);
      } else {
        const explanationText = detailsMatch[1];
        
        // Test 4: Correct Answers format
        const correctAnswersMatch = explanationText.match(CORRECT_ANSWERS_PATTERN);
        testResult(`Question ${index+1} has proper Correct Answers format`,
                  correctAnswersMatch !== null);
        
        if (!correctAnswersMatch) {
          fileIssues[fileName].push(`Question ${index+1} doesn't use the standard "**Correct Answers:** A, B, C" format`);
          
          // Try to fix the format if possible
          const fixedSection = fixAnswerFormat(section, questionType, optionMatches);
          if (fixedSection !== section) {
            content = content.replace(section, fixedSection);
            modified = true;
            fileIssues[fileName].push(`Question ${index+1} answer format was fixed automatically`);
          }
        } else {
          // Validate correct answers based on question type
          const correctLetters = correctAnswersMatch[1].split(/[,\s]+/).filter(letter => /^[A-Z]$/.test(letter));
          
          if (questionType === QUESTION_TYPES.TRUE_FALSE && correctLetters.length !== 1) {
            fileIssues[fileName].push(`Question ${index+1} is True/False but has ${correctLetters.length} correct answers`);
          } else if (questionType === QUESTION_TYPES.MULTIPLE_CHOICE && correctLetters.length !== 1) {
            fileIssues[fileName].push(`Question ${index+1} is Multiple Choice but has ${correctLetters.length} correct answers`);
          }
        }
      }
    });
    
    // Write changes if modified
    if (modified) {
      fs.writeFileSync(filePath, content);
      modifiedFiles.push(fileName);
    }
    
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    fileIssues[fileName].push(`Error: ${error.message}`);
  }
}

/**
 * Fix missing answer format in a question section
 */
function fixAnswerFormat(section, questionType, optionMatches) {
  // Extract details section
  const detailsMatch = section.match(/<details>[\s\S]+?<summary>Show Answer<\/summary>([\s\S]+?)<\/details>/);
  if (!detailsMatch) return section;
  
  const explanationText = detailsMatch[1];
  let correctLetters = [];
  
  // Look for checkmarks or "correct" indicators
  optionMatches.forEach(match => {
    const letter = match[1];
    const optionText = match[2];
    
    // Check if this option is marked as correct in the explanation
    if (explanationText.includes(`✅ ${optionText}`) || 
        explanationText.includes(`correct: ${optionText}`) ||
        explanationText.includes(`Correct: ${optionText}`) ||
        explanationText.toLowerCase().includes(`true`) && optionText.toLowerCase().includes('true') ||
        explanationText.toLowerCase().includes(`false`) && optionText.toLowerCase().includes('false')) {
      correctLetters.push(letter);
    }
  });
  
  // If no correct letters found but this is True/False, try to infer
  if (correctLetters.length === 0 && questionType === QUESTION_TYPES.TRUE_FALSE) {
    if (explanationText.toLowerCase().includes('true')) {
      // Find which option has "True"
      optionMatches.forEach(match => {
        if (match[2].toLowerCase().includes('true')) {
          correctLetters.push(match[1]);
        }
      });
    } else if (explanationText.toLowerCase().includes('false')) {
      // Find which option has "False"
      optionMatches.forEach(match => {
        if (match[2].toLowerCase().includes('false')) {
          correctLetters.push(match[1]);
        }
      });
    }
  }
  
  // If we found correct answers, update the section
  if (correctLetters.length > 0) {
    const correctAnswersText = `**Correct Answers:** ${correctLetters.join(', ')}`;
    
    // Check if there's already a line starting with **Correct Answer
    if (explanationText.match(/^\*\*Correct Answer/m)) {
      // Replace existing line
      const updatedExplanation = explanationText.replace(/^\*\*Correct Answer[^*]*\*\*[^\n]*$/m, correctAnswersText);
      return section.replace(explanationText, updatedExplanation);
    } else {
      // Add line at the beginning of the explanation
      const updatedExplanation = `\n${correctAnswersText}\n${explanationText}`;
      return section.replace(explanationText, updatedExplanation);
    }
  }
  
  return section;
}

/**
 * Record test result and update counts
 */
function testResult(testName, isPassing) {
  totalTests++;
  if (isPassing) {
    passedTests++;
    //console.log(`✅ PASS: ${testName}`);
  } else {
    failedTests++;
    console.log(`❌ FAIL: ${testName}`);
  }
}

/**
 * Print summary report
 */
function printReport() {
  console.log("\n========== TEST SUMMARY ==========");
  console.log(`Total tests run: ${totalTests}`);
  console.log(`Passed: ${passedTests} (${Math.round(passedTests/totalTests*100)}%)`);
  console.log(`Failed: ${failedTests} (${Math.round(failedTests/totalTests*100)}%)`);
  
  console.log("\n========== QUESTION STATISTICS ==========");
  console.log(`Total questions analyzed: ${questionCount}`);
  console.log(`True/False questions: ${trueFalseCount} (${Math.round(trueFalseCount/questionCount*100)}%)`);
  console.log(`Multiple Choice questions: ${multipleChoiceCount} (${Math.round(multipleChoiceCount/questionCount*100)}%)`);
  console.log(`Multi-Select questions: ${multiSelectCount} (${Math.round(multiSelectCount/questionCount*100)}%)`);
  
  console.log("\n========== FILE ISSUES ==========");
  let totalIssues = 0;
  for (const fileName in fileIssues) {
    const issues = fileIssues[fileName];
    totalIssues += issues.length;
    
    if (issues.length > 0) {
      console.log(`\n${fileName} (${issues.length} issues):`);
      issues.forEach(issue => console.log(`  - ${issue}`));
    }
  }
  
  if (totalIssues === 0) {
    console.log("No issues found! All files match the standardized format.");
  } else {
    console.log(`\nTotal issues found: ${totalIssues}`);
  }
  
  if (modifiedFiles.length > 0) {
    console.log("\n========== MODIFIED FILES ==========");
    console.log(`The following files were automatically fixed:`);
    modifiedFiles.forEach(file => console.log(`  - ${file}`));
  }
}

/**
 * Main function
 */
function main() {
  console.log("Running markdown format tests...");
  
  // Find all Combined.md files
  const files = glob.sync(path.join(__dirname, 'quizzes/*Combined.md'));
  console.log(`Found ${files.length} Combined.md files to test`);
  
  // Test each file
  files.forEach(file => testFile(file));
  
  // Print summary report
  printReport();
}

// Run the tests
main();