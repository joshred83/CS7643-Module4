/**
 * Critical Issues Test for Quiz Files
 * 
 * This script focuses only on critical functional issues that would prevent
 * quiz questions from working properly - specifically looking for:
 * 
 * 1. Missing or incorrect "Correct Answers:" format
 * 2. Placeholder text that needs replacement
 * 3. Improper option formatting
 * 4. Missing or incorrect details/answer sections
 * 5. Data-correct attribute issues in HTML output
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const CONFIG = {
  // Whether to validate HTML files along with markdown
  CHECK_HTML: true,
  // Whether to show passing files
  SHOW_PASSING: false,
  // Filter by file pattern (leave empty for all quiz files)
  FILE_FILTER: ""
};

// Tracking results
const results = {
  markdown: {
    total: 0,
    passing: 0,
    fileResults: {}
  },
  html: {
    total: 0,
    passing: 0,
    fileResults: {}
  },
  criticalIssues: {
    "placeholder": 0,
    "answer-format": 0,
    "option-format": 0,
    "missing-details": 0,
    "html-mismatch": 0
  }
};

/**
 * Main function
 */
function runTests() {
  console.log("🔍 Running critical issue tests for quiz files...");
  
  // Get all quiz markdown files
  let pattern = 'quizzes/*Combined.md';
  if (CONFIG.FILE_FILTER) {
    pattern = `quizzes/*${CONFIG.FILE_FILTER}*`;
  }
  
  const files = glob.sync(path.join(__dirname, pattern));
  results.markdown.total = files.length;
  
  console.log(`Found ${files.length} quiz files to check\n`);
  
  // Test each file
  files.forEach(file => {
    testMarkdownFile(file);
    
    // Also check HTML if enabled
    if (CONFIG.CHECK_HTML) {
      const htmlFile = file.replace('.md', '.html');
      if (fs.existsSync(htmlFile)) {
        testHtmlFile(file, htmlFile);
      }
    }
  });
  
  // Generate summary
  printSummary();
  
  // Generate comprehensive fix report for files with issues
  console.log("\n============ FIX RECOMMENDATIONS ============");
  let fixCommands = generateFixCommands();
  console.log(fixCommands);
}

/**
 * Test markdown file for critical issues
 */
function testMarkdownFile(filePath) {
  const fileName = path.basename(filePath);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let criticalIssues = [];
    
    // Initialize result tracking
    results.markdown.fileResults[fileName] = {
      issues: [],
      questionsWithIssues: 0,
      totalQuestions: 0
    };
    
    // Split into sections
    const sections = content.split(/(?=#{3}\s+Question \d+)/g)
      .filter(s => s.trim().length > 0 && s.match(/^#{3}\s+Question \d+/));
    
    results.markdown.fileResults[fileName].totalQuestions = sections.length;
    
    // Check each question section
    sections.forEach((section, index) => {
      const questionNum = index + 1;
      let sectionHasIssues = false;
      
      // Check for properly formatted options
      const optionMatches = [...section.matchAll(/^- \[ \] ([A-Z])\.\s+(.+)$/gm)];
      if (optionMatches.length === 0) {
        criticalIssues.push(`Question ${questionNum}: No properly formatted options found`);
        results.markdown.fileResults[fileName].issues.push({
          question: questionNum,
          type: "option-format",
          details: "No properly formatted options"
        });
        results.criticalIssues["option-format"]++;
        sectionHasIssues = true;
      }
      
      // Check for details section
      const detailsMatch = section.match(/<details>[\s\S]+?<summary>Show Answer<\/summary>([\s\S]+?)<\/details>/);
      if (!detailsMatch) {
        criticalIssues.push(`Question ${questionNum}: Missing details/answer section`);
        results.markdown.fileResults[fileName].issues.push({
          question: questionNum,
          type: "missing-details",
          details: "Missing details/answer section"
        });
        results.criticalIssues["missing-details"]++;
        sectionHasIssues = true;
      } else {
        const explanationText = detailsMatch[1];
        
        // Check for placeholder text
        if (explanationText.includes("[Need to manually determine]") || 
            explanationText.includes("[Manual review required]")) {
          criticalIssues.push(`Question ${questionNum}: Contains placeholder text that needs replacement`);
          results.markdown.fileResults[fileName].issues.push({
            question: questionNum,
            type: "placeholder",
            details: "Contains placeholder text that needs replacement"
          });
          results.criticalIssues["placeholder"]++;
          sectionHasIssues = true;
        }
        
        // Check for proper Correct Answers format
        const correctAnswersMatch = explanationText.match(/^\*\*Correct Answers?:\*\*\s+([A-Z,\s]+)$/m);
        if (!correctAnswersMatch) {
          criticalIssues.push(`Question ${questionNum}: Missing or incorrect "Correct Answers:" format`);
          results.markdown.fileResults[fileName].issues.push({
            question: questionNum,
            type: "answer-format",
            details: "Missing or incorrect 'Correct Answers:' format"
          });
          results.criticalIssues["answer-format"]++;
          sectionHasIssues = true;
        }
      }
      
      if (sectionHasIssues) {
        results.markdown.fileResults[fileName].questionsWithIssues++;
      }
    });
    
    // Record overall file status
    if (criticalIssues.length === 0) {
      results.markdown.passing++;
      if (CONFIG.SHOW_PASSING) {
        console.log(`✅ ${fileName} has no critical markdown issues`);
      }
    } else {
      console.log(`❌ ${fileName} has ${criticalIssues.length} critical issues:`);
      criticalIssues.forEach(issue => console.log(`  - ${issue}`));
    }
    
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

/**
 * Test HTML file for critical issues, focusing on data-correct attributes
 */
function testHtmlFile(mdFilePath, htmlFilePath) {
  const fileName = path.basename(htmlFilePath);
  const mdFileName = path.basename(mdFilePath);
  
  try {
    const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    const mdContent = fs.readFileSync(mdFilePath, 'utf8');
    
    let criticalIssues = [];
    
    // Initialize result tracking
    results.html.fileResults[fileName] = {
      issues: [],
      questionsWithIssues: 0,
      totalQuestions: 0
    };
    
    // Parse markdown for correct answers
    const markdownQuestions = parseMarkdownForAnswers(mdContent);
    
    // Parse HTML for data-correct attributes
    const htmlQuestions = parseHtmlForDataCorrect(htmlContent);
    
    results.html.fileResults[fileName].totalQuestions = htmlQuestions.length;
    
    // Compare each question
    markdownQuestions.forEach(mdQuestion => {
      const htmlQuestion = htmlQuestions.find(q => q.number === mdQuestion.number);
      
      if (!htmlQuestion) {
        criticalIssues.push(`Question ${mdQuestion.number}: Not found in HTML output`);
        results.html.fileResults[fileName].issues.push({
          question: mdQuestion.number,
          type: "html-mismatch",
          details: "Question not found in HTML output"
        });
        results.criticalIssues["html-mismatch"]++;
        return;
      }
      
      // Check if correct answers in markdown match data-correct in HTML
      if (mdQuestion.correctLetters.length > 0) {
        let mismatchFound = false;
        
        htmlQuestion.options.forEach(option => {
          const shouldBeCorrect = mdQuestion.correctLetters.includes(option.letter);
          if (option.isCorrect !== shouldBeCorrect) {
            mismatchFound = true;
          }
        });
        
        if (mismatchFound) {
          criticalIssues.push(`Question ${mdQuestion.number}: Correct answers in markdown don't match data-correct in HTML`);
          results.html.fileResults[fileName].issues.push({
            question: mdQuestion.number,
            type: "html-mismatch",
            details: "Correct answers in markdown don't match data-correct in HTML"
          });
          results.criticalIssues["html-mismatch"]++;
          results.html.fileResults[fileName].questionsWithIssues++;
        }
      }
    });
    
    // Record overall file status
    if (criticalIssues.length === 0) {
      results.html.passing++;
      if (CONFIG.SHOW_PASSING) {
        console.log(`✅ ${fileName} has no critical HTML issues`);
      }
    } else if (criticalIssues.length > 0) {
      console.log(`❌ ${fileName} has ${criticalIssues.length} critical HTML issues`);
      // Only show first few issues to avoid overwhelming output
      criticalIssues.slice(0, 3).forEach(issue => console.log(`  - ${issue}`));
      if (criticalIssues.length > 3) {
        console.log(`  - ... and ${criticalIssues.length - 3} more issues`);
      }
    }
    
  } catch (error) {
    console.error(`Error processing HTML file ${htmlFilePath}:`, error);
  }
}

/**
 * Parse markdown content to extract questions and their correct answers
 */
function parseMarkdownForAnswers(content) {
  const questions = [];
  
  // Split content into sections
  const sections = content.split(/(?=#{3}\s+Question \d+)/g)
    .filter(s => s.trim().length > 0 && s.match(/^#{3}\s+Question \d+/));
  
  // Extract question data from each section
  sections.forEach(section => {
    const headerMatch = section.match(/^#{3}\s+Question (\d+)/);
    if (!headerMatch) return;
    
    const questionNumber = parseInt(headerMatch[1], 10);
    
    // Extract options
    const optionMatches = [...section.matchAll(/^- \[ \] ([A-Z])\.\s+(.+)$/gm)];
    const options = optionMatches.map(match => ({
      letter: match[1],
      text: match[2].trim()
    }));
    
    // Extract correct answers
    let correctLetters = [];
    const detailsMatch = section.match(/<details>[\s\S]+?<summary>Show Answer<\/summary>([\s\S]+?)<\/details>/);
    
    if (detailsMatch) {
      const explanationText = detailsMatch[1];
      
      // Look for standard format
      const answersMatch = explanationText.match(/^\*\*Correct Answers?:\*\*\s+([A-Z,\s]+)$/m);
      if (answersMatch) {
        correctLetters = answersMatch[1].split(/[,\s]+/).filter(letter => /^[A-Z]$/.test(letter));
      } 
      // Alternative: Look for checkmarks
      else if (explanationText.includes('✅') || explanationText.includes('✓')) {
        optionMatches.forEach(match => {
          const letterPrefix = match[1];
          const optionText = match[2].trim();
          if (explanationText.includes(`✅ ${optionText}`) || 
              explanationText.includes(`✓ ${optionText}`)) {
            correctLetters.push(letterPrefix);
          }
        });
      }
    }
    
    questions.push({
      number: questionNumber,
      options: options,
      correctLetters: correctLetters
    });
  });
  
  return questions;
}

/**
 * Parse HTML content to extract questions and their data-correct attributes
 */
function parseHtmlForDataCorrect(content) {
  const questions = [];
  
  // Extract question divs
  const questionDivs = [...content.matchAll(/<div class="question"[^>]*data-question-index="(\d+)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g)];
  
  questionDivs.forEach(match => {
    const questionIndex = parseInt(match[1], 10);
    const questionContent = match[2];
    
    // Extract question number from header
    const headerMatch = questionContent.match(/<h3>(.+?)<\/h3>/);
    if (!headerMatch) return;
    
    const questionInfo = headerMatch[1].match(/Question\s+(\d+)/);
    if (!questionInfo) return;
    
    const questionNumber = parseInt(questionInfo[1], 10);
    
    // Extract options with data-correct values
    const options = [];
    const optionMatches = [
      ...questionContent.matchAll(/<input[^>]*data-correct="([^"]+)"[^>]*>[\s\S]*?<label[^>]*>([A-Z])\.\s+(.+?)<\/label>/g)
    ];
    
    optionMatches.forEach(match => {
      options.push({
        isCorrect: match[1] === 'true',
        letter: match[2],
        text: match[3].trim()
      });
    });
    
    questions.push({
      index: questionIndex,
      number: questionNumber,
      options: options
    });
  });
  
  return questions;
}

/**
 * Print a summary of test results
 */
function printSummary() {
  console.log("\n============ SUMMARY ============");
  
  // Markdown file summary
  console.log(`Markdown Files: ${results.markdown.passing}/${results.markdown.total} passing (${Math.round(results.markdown.passing/results.markdown.total*100)}%)`);
  
  // HTML file summary (if checked)
  if (CONFIG.CHECK_HTML) {
    console.log(`HTML Files: ${results.html.passing}/${results.html.total} passing (${Math.round(results.html.passing/results.html.total*100)}%)`);
  }
  
  // Critical issues by type
  console.log("\nCritical Issues by Type:");
  console.log(`- Placeholder text: ${results.criticalIssues["placeholder"]}`);
  console.log(`- Answer format: ${results.criticalIssues["answer-format"]}`);
  console.log(`- Option format: ${results.criticalIssues["option-format"]}`);
  console.log(`- Missing details: ${results.criticalIssues["missing-details"]}`);
  console.log(`- HTML mismatches: ${results.criticalIssues["html-mismatch"]}`);
  
  // Files with most issues
  console.log("\nFiles with Critical Issues:");
  
  const fileIssues = Object.entries(results.markdown.fileResults)
    .filter(([_, result]) => result.issues.length > 0)
    .sort((a, b) => b[1].issues.length - a[1].issues.length);
  
  fileIssues.forEach(([fileName, result]) => {
    console.log(`- ${fileName}: ${result.questionsWithIssues}/${result.totalQuestions} questions with issues`);
    
    // Group by issue type
    const issuesByType = {};
    result.issues.forEach(issue => {
      if (!issuesByType[issue.type]) {
        issuesByType[issue.type] = [];
      }
      issuesByType[issue.type].push(issue);
    });
    
    // Print summary by issue type
    Object.entries(issuesByType).forEach(([type, issues]) => {
      console.log(`  - ${type}: ${issues.length} issues`);
    });
  });
}

/**
 * Generate fix commands to help resolve issues
 */
function generateFixCommands() {
  let commands = `
To fix the critical issues in your quiz files, follow these steps:

1. Fix placeholder text and answer format issues:
   - Run the standardize_markdown.js script to fix most formatting issues:
     $ cd /home/red/CS7643-Module4/docs && node standardize_markdown.js
     
2. For any remaining files with issues (especially missing details sections):
   - Copy the fixed format from 17.2Combined.md which passed all tests:
     $ cp /home/red/CS7643-Module4/17.2Combined.md /home/red/CS7643-Module4/docs/quizzes/

3. Regenerate HTML files to fix data-correct attribute issues:
   - Run the build.js script:
     $ cd /home/red/CS7643-Module4/docs && node build.js

4. Specific files needing manual intervention:
`;

  // Add specific commands for problematic files
  const problemFiles = Object.entries(results.markdown.fileResults)
    .filter(([_, result]) => result.questionsWithIssues > 0)
    .sort((a, b) => b[1].questionsWithIssues - a[1].questionsWithIssues);
  
  problemFiles.forEach(([fileName, result]) => {
    commands += `   - ${fileName}: ${result.questionsWithIssues}/${result.totalQuestions} questions with issues\n`;
    
    // Suggest specific fixes based on issue types
    const hasPlaceholder = result.issues.some(i => i.type === "placeholder");
    const hasAnswerFormat = result.issues.some(i => i.type === "answer-format");
    const hasOptionFormat = result.issues.some(i => i.type === "option-format");
    
    if (hasPlaceholder) {
      commands += `     * Replace placeholder text with actual correct answers\n`;
    }
    if (hasAnswerFormat) {
      commands += `     * Fix "Correct Answers:" format to use letter notation (A, B, C)\n`;
    }
    if (hasOptionFormat) {
      commands += `     * Format options as "- [ ] A. Option text"\n`;
    }
  });
  
  commands += `
5. After fixing all issues, run this test again to verify:
   $ cd /home/red/CS7643-Module4/docs && node test_critical_issues.js
`;
  
  return commands;
}

// Run the tests
runTests();