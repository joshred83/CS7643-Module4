/**
 * Unit tests for checking specific questions and answers in quiz files
 * This script:
 * 1. Tests 3 questions from each Combined.md file (one of each type when possible)
 * 2. Verifies the correct answers are properly marked
 * 3. Ensures the HTML output correctly sets data-correct attributes
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Object to store test results
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  fileResults: {}
};

// Question types to test
const QUESTION_TYPES = {
  TRUE_FALSE: 'True/False',
  MULTIPLE_CHOICE: 'Multiple Choice',
  MULTI_SELECT: 'Multi-Select'
};

/**
 * Parse a markdown file and extract questions
 */
function parseMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  // Split into sections
  const sections = content.split(/(?=#{3}\s+Question \d+)/g).filter(s => s.trim().length > 0);
  
  // Get title
  const titleMatch = content.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1] : fileName;
  
  // Parse questions
  const questions = [];
  
  // Skip title section
  sections.forEach(section => {
    // Make sure it's a question section
    if (!section.match(/^### Question \d+/m)) {
      return;
    }
    
    try {
      // Get question number and type
      const headerMatch = section.match(/^### Question (\d+)(?:\s*\(([^)]+)\))?/m);
      if (!headerMatch) return;
      
      const questionNumber = parseInt(headerMatch[1]);
      let questionType = headerMatch[2] ? headerMatch[2].trim() : 'Unknown';
      
      // Standardize question type
      if (questionType.toLowerCase().includes('true') && questionType.toLowerCase().includes('false')) {
        questionType = QUESTION_TYPES.TRUE_FALSE;
      } else if (questionType.toLowerCase().includes('multiple choice')) {
        questionType = QUESTION_TYPES.MULTIPLE_CHOICE;
      } else if (questionType.toLowerCase().includes('multi-select') || 
                 questionType.toLowerCase().includes('multiple select')) {
        questionType = QUESTION_TYPES.MULTI_SELECT;
      }
      
      // Get question text
      const headerEnd = section.indexOf('\n\n', section.indexOf(headerMatch[0]));
      const optionsStart = section.indexOf('- [ ]');
      let questionText = '';
      
      if (headerEnd !== -1 && optionsStart !== -1) {
        questionText = section.substring(headerEnd, optionsStart).trim();
      }
      
      // Get options
      const options = [];
      const optionRegex = /- \[ \] ([A-Z])\.\s+(.+)/g;
      let optionMatch;
      
      while ((optionMatch = optionRegex.exec(section)) !== null) {
        options.push({
          letter: optionMatch[1],
          text: optionMatch[2].trim()
        });
      }
      
      // Get correct answers
      const detailsMatch = section.match(/<details>[\s\S]+?<summary>Show Answer<\/summary>([\s\S]+?)<\/details>/);
      let correctLetters = [];
      
      if (detailsMatch) {
        const explanation = detailsMatch[1];
        const correctAnswersMatch = explanation.match(/\*\*Correct Answers?:\*\*\s+([A-Z,\s]+)/i);
        
        if (correctAnswersMatch) {
          correctLetters = correctAnswersMatch[1]
            .split(/[,\s]+/)
            .filter(letter => /^[A-Z]$/.test(letter));
        }
      }
      
      // Add to questions array
      questions.push({
        number: questionNumber,
        type: questionType,
        text: questionText,
        options: options,
        correctLetters: correctLetters
      });
    } catch (error) {
      console.error(`Error parsing question in ${fileName}:`, error);
    }
  });
  
  return {
    fileName,
    title,
    questions
  };
}

/**
 * Build HTML from a markdown file to test rendering
 */
function buildHtml(markdownPath) {
  const fileName = path.basename(markdownPath, '.md');
  const htmlPath = path.join(path.dirname(markdownPath), `${fileName}.html`);
  
  try {
    if (fs.existsSync(htmlPath)) {
      return fs.readFileSync(htmlPath, 'utf8');
    } else {
      console.log(`HTML file for ${fileName} not found`);
      return null;
    }
  } catch (error) {
    console.error(`Error reading HTML file for ${fileName}:`, error);
    return null;
  }
}

/**
 * Check if HTML correctly marks the correct answers
 */
function checkHtmlCorrectAnswers(html, question) {
  // Extract the question section from HTML
  const questionRegex = new RegExp(`<div class="question"[^>]*data-question-index="${question.number - 1}"[^>]*>[\\s\\S]*?<\\/div>\\s*<\\/div>`, 'i');
  const questionMatch = html.match(questionRegex);
  
  if (!questionMatch) {
    return {
      passed: false,
      message: `Question ${question.number} not found in HTML output`
    };
  }
  
  const questionHtml = questionMatch[0];
  
  // Check each option for correct data-correct attribute
  let allCorrect = true;
  const errors = [];
  
  for (const option of question.options) {
    const isCorrect = question.correctLetters.includes(option.letter);
    const correctStr = isCorrect ? "true" : "false";
    
    // Look for the option in HTML
    const optionRegex = new RegExp(`<input[^>]*>[^<]*${option.letter}\\.\\s*${escapeRegExp(option.text)}`, 'i');
    const optionInputRegex = new RegExp(`<input[^>]*data-correct="${correctStr}"[^>]*>`, 'i');
    
    const optionMatch = questionHtml.match(optionRegex);
    
    if (!optionMatch) {
      allCorrect = false;
      errors.push(`Option ${option.letter} not found in HTML for question ${question.number}`);
      continue;
    }
    
    // Find the containing element
    const optionHtml = questionHtml.substring(0, optionMatch.index + 100);
    const inputMatch = optionHtml.match(optionInputRegex);
    
    if (!inputMatch) {
      allCorrect = false;
      errors.push(`Option ${option.letter} does not have correct data-correct="${correctStr}" attribute`);
    }
  }
  
  return {
    passed: allCorrect,
    message: errors.join(', ')
  };
}

/**
 * Helper function to escape special regex characters
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get a sample of different question types from a file
 */
function getQuestionSamples(fileInfo) {
  const result = {
    trueFalse: null,
    multipleChoice: null,
    multiSelect: null
  };
  
  for (const question of fileInfo.questions) {
    if (question.type === QUESTION_TYPES.TRUE_FALSE && !result.trueFalse) {
      result.trueFalse = question;
    } else if (question.type === QUESTION_TYPES.MULTIPLE_CHOICE && !result.multipleChoice) {
      result.multipleChoice = question;
    } else if (question.type === QUESTION_TYPES.MULTI_SELECT && !result.multiSelect) {
      result.multiSelect = question;
    }
    
    // Break early if we have all three types
    if (result.trueFalse && result.multipleChoice && result.multiSelect) {
      break;
    }
  }
  
  return result;
}

/**
 * Test a specific question
 */
function testQuestion(fileInfo, question, html) {
  if (!question) return null;
  
  const testName = `${fileInfo.fileName} - Q${question.number} (${question.type})`;
  const result = {
    name: testName,
    passed: true,
    errors: []
  };
  
  // Test 1: Question has the correct number of correct answers for its type
  if (question.type === QUESTION_TYPES.TRUE_FALSE || question.type === QUESTION_TYPES.MULTIPLE_CHOICE) {
    if (question.correctLetters.length !== 1) {
      result.passed = false;
      result.errors.push(`Expected 1 correct answer, found ${question.correctLetters.length}`);
    }
  } else if (question.type === QUESTION_TYPES.MULTI_SELECT) {
    if (question.correctLetters.length < 1) {
      result.passed = false;
      result.errors.push(`Expected at least 1 correct answer, found ${question.correctLetters.length}`);
    }
  }
  
  // Test 2: HTML correctly marks answers
  if (html) {
    const htmlCheck = checkHtmlCorrectAnswers(html, question);
    if (!htmlCheck.passed) {
      result.passed = false;
      result.errors.push(htmlCheck.message);
    }
  }
  
  return result;
}

/**
 * Test specific questions in a file
 */
function testSpecificQuestions(filePath) {
  const fileInfo = parseMarkdownFile(filePath);
  const html = buildHtml(filePath);
  const samples = getQuestionSamples(fileInfo);
  
  const fileResults = {
    fileName: fileInfo.fileName,
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };
  
  testResults.fileResults[fileInfo.fileName] = fileResults;
  
  // Test each question type
  for (const type in samples) {
    const question = samples[type];
    if (question) {
      const result = testQuestion(fileInfo, question, html);
      if (result) {
        fileResults.total++;
        testResults.total++;
        
        if (result.passed) {
          fileResults.passed++;
          testResults.passed++;
        } else {
          fileResults.failed++;
          testResults.failed++;
        }
        
        fileResults.tests.push(result);
      }
    }
  }
  
  return fileResults;
}

/**
 * Print test results
 */
function printResults() {
  console.log("\n========== SPECIFIC QUESTION TESTS ==========");
  console.log(`Total tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed} (${Math.round(testResults.passed/testResults.total*100)}%)`);
  console.log(`Failed: ${testResults.failed} (${Math.round(testResults.failed/testResults.total*100)}%)`);
  
  console.log("\n---------- Detailed Results ----------");
  
  for (const fileName in testResults.fileResults) {
    const fileResult = testResults.fileResults[fileName];
    console.log(`\n${fileName}: ${fileResult.passed}/${fileResult.total} passed`);
    
    for (const test of fileResult.tests) {
      if (test.passed) {
        console.log(`  ✅ PASS: ${test.name}`);
      } else {
        console.log(`  ❌ FAIL: ${test.name}`);
        for (const error of test.errors) {
          console.log(`    - ${error}`);
        }
      }
    }
  }
}

/**
 * Main function
 */
function main() {
  console.log("Running specific question tests...");
  
  // Find all Combined.md files
  const files = glob.sync(path.join(__dirname, 'quizzes/*Combined.md'));
  console.log(`Found ${files.length} Combined.md files to test`);
  
  // Test each file
  files.forEach(file => testSpecificQuestions(file));
  
  // Print results
  printResults();
}

// Run the tests
main();