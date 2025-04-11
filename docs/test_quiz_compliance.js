/**
 * Comprehensive Tests for Quiz Markdown Compliance
 * 
 * This script checks all quiz markdown files for compliance with the required 
 * formatting specifications, ensuring consistent structure across all quizzes.
 * 
 * Features:
 * - Validates quiz title and proper heading structure
 * - Ensures questions have proper numbering and type designation
 * - Verifies standard letter-prefixed options format (A, B, C, etc.)
 * - Checks for consistent "Correct Answers:" format using letter notation
 * - Tests for proper <details>/<summary> structure in answer sections
 * - Validates that correct answer designations match question types
 * - Detects placeholder text that requires replacement
 * - Ensures proper spacing and section separation
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const OPTIONS = {
  VERBOSE: false,        // Whether to show passing tests
  FIX_ISSUES: false,     // Whether to automatically fix certain issues
  SUMMARY_ONLY: false,   // Only show the summary, not individual file reports
};

// Content patterns
const PATTERNS = {
  // Basic structure
  QUIZ_TITLE: /^# Quiz:/,
  QUESTION_HEADER: /^### Question (\d+)\s*\(([^)]+)\)/,
  OPTION_FORMAT: /^- \[ \] ([A-Z])\.\s+(.+)$/,
  DETAILS_SECTION: /<details>[\s\S]+?<summary>Show Answer<\/summary>([\s\S]+?)<\/details>/,
  CORRECT_ANSWERS: /^\*\*Correct Answers?:\*\*\s+([A-Z,\s]+)$/m,
  SECTION_SEPARATOR: /^---$/m,
  
  // Problem indicators
  NEEDS_DETERMINATION: /\[Need to manually determine\]|\[Manual review required\]/,
  CHECKMARK_USAGE: /✅|✓/,
  
  // Question types
  QUESTION_TYPES: {
    TRUE_FALSE: /true[\/-]false/i,
    MULTIPLE_CHOICE: /multiple choice/i,
    MULTIPLE_SELECT: /multi[- ]select|multiple select/i
  }
};

// Test results tracking
const results = {
  totalFiles: 0,
  passedFiles: 0,
  totalTests: 0,
  passedTests: 0,
  fileResults: {},
  issuesByType: {
    'Title Format': 0,
    'Question Format': 0,
    'Option Format': 0,
    'Answer Format': 0,
    'Section Structure': 0,
    'Placeholder Text': 0,
    'Answer Designation': 0,
    'Question Type': 0
  }
};

/**
 * Main function to run all tests
 */
function runTests() {
  console.log("🔍 Running quiz markdown compliance tests...");
  
  // Find all quiz markdown files
  const files = glob.sync(path.join(__dirname, 'quizzes/*Combined.md'));
  results.totalFiles = files.length;
  
  console.log(`Found ${files.length} Combined markdown files to test\n`);
  
  // Test each file
  files.forEach(file => testFile(file));
  
  // Print summary
  printSummary();
}

/**
 * Test a single markdown file for compliance
 */
function testFile(filePath) {
  const fileName = path.basename(filePath);
  if (!OPTIONS.SUMMARY_ONLY) {
    console.log(`\n📄 Testing file: ${fileName}`);
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let isFilePassing = true;
    
    // Initialize result tracking for this file
    results.fileResults[fileName] = {
      tests: 0,
      passed: 0,
      issues: []
    };
    
    // Test 1: Quiz title format
    const hasTitleFormat = test(
      fileName,
      "Quiz title format",
      PATTERNS.QUIZ_TITLE.test(content)
    );
    if (!hasTitleFormat) {
      isFilePassing = false;
      results.issuesByType['Title Format']++;
    }
    
    // Split into sections (title and questions)
    const sections = content.split(/(?=#{3}\s+Question \d+)/g).filter(s => s.trim().length > 0);
    
    // Check each question section
    let questionSections = sections.slice(1); // Skip title section
    if (questionSections.length === 0 && sections.length > 0) {
      // No proper question sections found, might need to parse differently
      questionSections = sections;
    }
    
    // Process each question section
    questionSections.forEach((section, idx) => {
      const questionNum = idx + 1;
      
      // Test 2: Question header format
      const headerMatch = section.match(PATTERNS.QUESTION_HEADER);
      const hasProperHeader = test(
        fileName,
        `Question ${questionNum} header format`,
        headerMatch !== null
      );
      
      if (!hasProperHeader) {
        isFilePassing = false;
        results.issuesByType['Question Format']++;
        results.fileResults[fileName].issues.push(`Question ${questionNum} has malformed header`);
        return; // Skip further tests on this question
      }
      
      // Extract question type and validate
      const questionType = headerMatch[2]?.trim();
      const hasValidType = test(
        fileName,
        `Question ${questionNum} has valid type`,
        questionType && (
          PATTERNS.QUESTION_TYPES.TRUE_FALSE.test(questionType) ||
          PATTERNS.QUESTION_TYPES.MULTIPLE_CHOICE.test(questionType) ||
          PATTERNS.QUESTION_TYPES.MULTIPLE_SELECT.test(questionType)
        )
      );
      
      if (!hasValidType) {
        isFilePassing = false;
        results.issuesByType['Question Type']++;
        results.fileResults[fileName].issues.push(`Question ${questionNum} has non-standard type: ${questionType}`);
      }
      
      // Test 3: Check options format
      const optionMatches = [...section.matchAll(new RegExp(PATTERNS.OPTION_FORMAT, 'gm'))];
      const hasProperOptions = test(
        fileName,
        `Question ${questionNum} has properly formatted options`,
        optionMatches.length > 0
      );
      
      if (!hasProperOptions) {
        isFilePassing = false;
        results.issuesByType['Option Format']++;
        results.fileResults[fileName].issues.push(`Question ${questionNum} options are not properly formatted`);
      }
      
      // Test 4: Details section with proper structure
      const detailsMatch = section.match(PATTERNS.DETAILS_SECTION);
      const hasProperDetails = test(
        fileName,
        `Question ${questionNum} has proper details/answer section`,
        detailsMatch !== null
      );
      
      if (!hasProperDetails) {
        isFilePassing = false;
        results.issuesByType['Section Structure']++;
        results.fileResults[fileName].issues.push(`Question ${questionNum} is missing proper details/answer section`);
        return; // Skip further tests on this question
      }
      
      // Extract answer section
      const answerSection = detailsMatch[1];
      
      // Test 5: Answer section does not have placeholder text
      const hasNoPlaceholders = test(
        fileName,
        `Question ${questionNum} has no placeholder text`,
        !PATTERNS.NEEDS_DETERMINATION.test(answerSection)
      );
      
      if (!hasNoPlaceholders) {
        isFilePassing = false;
        results.issuesByType['Placeholder Text']++;
        results.fileResults[fileName].issues.push(`Question ${questionNum} contains placeholder text that needs replacement`);
      }
      
      // Test 6: Uses standard "Correct Answers:" format with letters
      const correctAnswersMatch = answerSection.match(PATTERNS.CORRECT_ANSWERS);
      const hasProperAnswerFormat = test(
        fileName,
        `Question ${questionNum} has proper "Correct Answers:" format`,
        correctAnswersMatch !== null
      );
      
      if (!hasProperAnswerFormat) {
        isFilePassing = false;
        results.issuesByType['Answer Format']++;
        results.fileResults[fileName].issues.push(`Question ${questionNum} doesn't use standard "**Correct Answers:** A, B, C" format`);
        
        // Check if using checkmarks instead
        if (PATTERNS.CHECKMARK_USAGE.test(answerSection)) {
          results.fileResults[fileName].issues.push(`Question ${questionNum} uses checkmarks instead of letter format`);
        }
      } else {
        // Test 7: Correct answers are valid for question type
        const correctLetters = correctAnswersMatch[1].split(/[,\s]+/).filter(l => /^[A-Z]$/.test(l));
        let validAnswerCount = true;
        
        // Different question types should have different numbers of correct answers
        if (PATTERNS.QUESTION_TYPES.TRUE_FALSE.test(questionType) && correctLetters.length !== 1) {
          validAnswerCount = false;
          results.fileResults[fileName].issues.push(
            `Question ${questionNum} is True/False but has ${correctLetters.length} correct answers`
          );
        } else if (PATTERNS.QUESTION_TYPES.MULTIPLE_CHOICE.test(questionType) && correctLetters.length !== 1) {
          validAnswerCount = false;
          results.fileResults[fileName].issues.push(
            `Question ${questionNum} is Multiple Choice but has ${correctLetters.length} correct answers`
          );
        }
        
        if (!validAnswerCount) {
          isFilePassing = false;
          results.issuesByType['Answer Designation']++;
        }
        
        // Validate that each correct letter corresponds to an option
        const optionLetters = optionMatches.map(match => match[1]);
        const invalidLetters = correctLetters.filter(letter => !optionLetters.includes(letter));
        
        if (invalidLetters.length > 0) {
          isFilePassing = false;
          results.issuesByType['Answer Designation']++;
          results.fileResults[fileName].issues.push(
            `Question ${questionNum} has correct answers ${invalidLetters.join(', ')} that don't match any options`
          );
        }
      }
      
      // Test 8: Section has proper separator
      if (idx < questionSections.length - 1) { // Skip last question
        const hasProperSeparator = test(
          fileName,
          `Question ${questionNum} has proper section separator`,
          section.includes('---')
        );
        
        if (!hasProperSeparator) {
          isFilePassing = false;
          results.issuesByType['Section Structure']++;
          results.fileResults[fileName].issues.push(`Question ${questionNum} is missing proper section separator '---'`);
        }
      }
    });
    
    // Record file result
    if (isFilePassing) {
      results.passedFiles++;
      if (!OPTIONS.SUMMARY_ONLY) {
        console.log(`✅ ${fileName} passed all compliance tests`);
      }
    } else if (!OPTIONS.SUMMARY_ONLY) {
      console.log(`❌ ${fileName} failed compliance tests`);
    }
    
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    results.fileResults[fileName].issues.push(`Error: ${error.message}`);
  }
}

/**
 * Run a single test and track results
 */
function test(fileName, testName, isPassing) {
  results.totalTests++;
  results.fileResults[fileName].tests++;
  
  if (isPassing) {
    results.passedTests++;
    results.fileResults[fileName].passed++;
    if (OPTIONS.VERBOSE && !OPTIONS.SUMMARY_ONLY) {
      console.log(`  ✓ ${testName}`);
    }
  } else {
    if (!OPTIONS.SUMMARY_ONLY) {
      console.log(`  ✗ ${testName}`);
    }
  }
  
  return isPassing;
}

/**
 * Print a summary of all test results
 */
function printSummary() {
  console.log("\n======== TEST SUMMARY ========");
  console.log(`Files: ${results.passedFiles}/${results.totalFiles} passed (${Math.round(results.passedFiles/results.totalFiles*100)}%)`);
  console.log(`Individual Tests: ${results.passedTests}/${results.totalTests} passed (${Math.round(results.passedTests/results.totalTests*100)}%)`);
  
  console.log("\n======== ISSUES BY TYPE ========");
  for (const [issueType, count] of Object.entries(results.issuesByType)) {
    if (count > 0) {
      console.log(`- ${issueType}: ${count} issues`);
    }
  }
  
  // Print detailed issues by file
  console.log("\n======== DETAILED FILE ISSUES ========");
  for (const [fileName, result] of Object.entries(results.fileResults)) {
    if (result.issues.length > 0) {
      console.log(`\n${fileName} (${result.passed}/${result.tests} tests passed):`);
      result.issues.forEach(issue => console.log(`  - ${issue}`));
    }
  }
  
  console.log("\n======== RECOMMENDATIONS ========");
  if (results.passedFiles < results.totalFiles) {
    console.log("1. Run the standardize_markdown.js script to fix formatting issues");
    console.log("2. Check files with placeholder text and manually fill in correct answers");
    console.log("3. Ensure all questions have proper section separators and valid types");
    console.log("4. Run the build.js script after fixes to regenerate HTML files");
  } else {
    console.log("All quiz files meet the required specifications!");
  }
}

// Run the tests
runTests();