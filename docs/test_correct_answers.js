/**
 * Test for Correct Answer Accuracy in Quiz Files
 * 
 * This script validates that:
 * 1. HTML quiz files contain the correct data-correct attributes based on markdown files
 * 2. The data-correct attributes match the "Correct Answers:" text in the explanations
 * 3. Proper answer formats are used in all questions
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Tracking
const results = {
  totalQuizzes: 0,
  totalQuestions: 0,
  questionsPassing: 0,
  issuesByCategory: {
    'Markdown/HTML Mismatch': 0,
    'Missing data-correct': 0,
    'Inconsistent Answers': 0,
    'Wrong Option Count': 0,
    'Invalid Format': 0
  },
  quizResults: {}
};

/**
 * Main function to check all quizzes
 */
function validateAllQuizzes() {
  console.log("🧪 Validating correct answer accuracy across all quizzes...");
  
  // Get all quiz markdown files
  const mdFiles = glob.sync(path.join(__dirname, 'quizzes/*Combined.md'));
  results.totalQuizzes = mdFiles.length;
  
  console.log(`Found ${mdFiles.length} quiz files to check\n`);
  
  // Process each markdown file and its corresponding HTML
  mdFiles.forEach(mdFile => {
    const baseName = path.basename(mdFile, '.md');
    const htmlFile = path.join(path.dirname(mdFile), `${baseName}.html`);
    
    // Check if HTML file exists
    if (fs.existsSync(htmlFile)) {
      validateQuiz(mdFile, htmlFile);
    } else {
      console.error(`❌ HTML file not found for ${baseName}`);
    }
  });
  
  // Print summary
  printSummary();
}

/**
 * Validate a single quiz by comparing markdown and HTML
 */
function validateQuiz(mdFilePath, htmlFilePath) {
  const baseName = path.basename(mdFilePath, '.md');
  console.log(`\nValidating quiz: ${baseName}`);
  
  // Initialize results for this quiz
  results.quizResults[baseName] = {
    questions: 0,
    passing: 0,
    issues: []
  };
  
  try {
    // Read files
    const mdContent = fs.readFileSync(mdFilePath, 'utf8');
    const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    
    // Parse markdown for questions and answers
    const mdQuestions = parseMarkdownQuestions(mdContent);
    
    // Parse HTML for data-correct attributes
    const htmlQuestions = parseHtmlQuestions(htmlContent);
    
    // Compare questions
    compareQuestions(mdQuestions, htmlQuestions, baseName);
    
  } catch (error) {
    console.error(`Error processing ${baseName}: ${error.message}`);
    results.quizResults[baseName].issues.push({
      type: 'Processing Error',
      details: error.message
    });
  }
}

/**
 * Parse a markdown file to extract questions and correct answers
 */
function parseMarkdownQuestions(content) {
  const questions = [];
  
  // Split into sections
  const sections = content.split(/(?=#{3}\s+Question \d+)/g)
    .filter(s => s.trim().length > 0 && s.match(/^#{3}\s+Question \d+/));
  
  // Process each question
  sections.forEach(section => {
    // Extract question number and type
    const headerMatch = section.match(/^#{3}\s+Question (\d+)\s*\(([^)]+)\)/);
    if (!headerMatch) return;
    
    const questionNumber = parseInt(headerMatch[1], 10);
    const questionType = headerMatch[2].trim();
    
    // Extract options
    const options = [];
    const optionMatches = [...section.matchAll(/^- \[ \] ([A-Z])\.\s+(.+)$/gm)];
    
    optionMatches.forEach(match => {
      options.push({
        letter: match[1],
        text: match[2].trim()
      });
    });
    
    // Extract correct answers
    let correctLetters = [];
    const detailsMatch = section.match(/<details>[\s\S]+?<summary>Show Answer<\/summary>([\s\S]+?)<\/details>/);
    
    if (detailsMatch) {
      const explanation = detailsMatch[1];
      const answersMatch = explanation.match(/^\*\*Correct Answers?:\*\*\s+([A-Z,\s]+)$/m);
      
      if (answersMatch) {
        correctLetters = answersMatch[1]
          .split(/[,\s]+/)
          .filter(letter => /^[A-Z]$/.test(letter));
      } else if (explanation.includes('✅') || explanation.includes('✓')) {
        // Try to extract from checkmarks
        optionMatches.forEach((match, idx) => {
          const optionText = match[2].trim();
          if (explanation.includes(`✅ ${optionText}`) || explanation.includes(`✓ ${optionText}`)) {
            correctLetters.push(match[1]);
          }
        });
      }
    }
    
    // Add to questions array
    questions.push({
      number: questionNumber,
      type: questionType,
      options: options,
      correctLetters: correctLetters
    });
  });
  
  return questions;
}

/**
 * Parse HTML quiz file to extract questions and data-correct attributes
 */
function parseHtmlQuestions(content) {
  const questions = [];
  
  // Extract question divs
  const questionDivs = [...content.matchAll(/<div class="question"[^>]*data-question-index="(\d+)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g)];
  
  questionDivs.forEach(match => {
    const questionIndex = parseInt(match[1], 10);
    const questionContent = match[2];
    
    // Extract question header
    const headerMatch = questionContent.match(/<h3>(.+?)<\/h3>/);
    if (!headerMatch) return;
    
    // Try to extract question number and type
    const questionInfo = headerMatch[1].match(/Question\s+(\d+)\s*\(([^)]+)\)/);
    if (!questionInfo) return;
    
    const questionNumber = parseInt(questionInfo[1], 10);
    const questionType = questionInfo[2].trim();
    
    // Extract options with data-correct values
    const options = [];
    const optionMatches = [
      ...questionContent.matchAll(/<input[^>]*value="(\d+)"[^>]*data-correct="([^"]+)"[^>]*>[\s\S]*?<label[^>]*>([A-Z])\.\s+(.+?)<\/label>/g)
    ];
    
    optionMatches.forEach(match => {
      options.push({
        value: match[1],
        isCorrect: match[2] === 'true',
        letter: match[3],
        text: match[4].trim()
      });
    });
    
    // Extract explanation to double-check correct answers
    let explanation = '';
    const explanationMatch = questionContent.match(/<div class="explanation"[^>]*>([\s\S]*?)<\/div>/);
    if (explanationMatch) {
      explanation = explanationMatch[1];
    }
    
    // Add to questions array
    questions.push({
      index: questionIndex,
      number: questionNumber, 
      type: questionType,
      options: options,
      explanation: explanation
    });
  });
  
  return questions;
}

/**
 * Compare markdown questions with HTML questions to validate correctness
 */
function compareQuestions(mdQuestions, htmlQuestions, quizName) {
  // Update counts
  results.totalQuestions += mdQuestions.length;
  results.quizResults[quizName].questions = mdQuestions.length;
  
  // First check that we have the same number of questions
  if (mdQuestions.length !== htmlQuestions.length) {
    console.warn(`⚠️ Question count mismatch in ${quizName}: ${mdQuestions.length} in markdown, ${htmlQuestions.length} in HTML`);
    results.quizResults[quizName].issues.push({
      type: 'Question Count',
      details: `MD: ${mdQuestions.length}, HTML: ${htmlQuestions.length}`
    });
  }
  
  // Compare each question
  mdQuestions.forEach(mdQuestion => {
    // Find matching HTML question
    const htmlQuestion = htmlQuestions.find(q => q.number === mdQuestion.number);
    
    if (!htmlQuestion) {
      console.error(`❌ Question ${mdQuestion.number} not found in HTML for ${quizName}`);
      results.quizResults[quizName].issues.push({
        question: mdQuestion.number,
        type: 'Missing Question',
        details: `Question ${mdQuestion.number} not found in HTML`
      });
      results.issuesByCategory['Markdown/HTML Mismatch']++;
      return;
    }
    
    // Check option count matches
    if (mdQuestion.options.length !== htmlQuestion.options.length) {
      console.warn(`⚠️ Option count mismatch in ${quizName} Q${mdQuestion.number}: ${mdQuestion.options.length} in markdown, ${htmlQuestion.options.length} in HTML`);
      results.quizResults[quizName].issues.push({
        question: mdQuestion.number,
        type: 'Option Count',
        details: `MD: ${mdQuestion.options.length}, HTML: ${htmlQuestion.options.length}`
      });
      results.issuesByCategory['Wrong Option Count']++;
    }
    
    // Check if the markdown has correct answers specified
    if (mdQuestion.correctLetters.length === 0) {
      console.error(`❌ No correct answers specified in markdown for ${quizName} Q${mdQuestion.number}`);
      results.quizResults[quizName].issues.push({
        question: mdQuestion.number,
        type: 'Missing Correct Answers',
        details: `No correct answers specified in markdown`
      });
      results.issuesByCategory['Invalid Format']++;
      return;
    }
    
    // Compare correct answers
    let allCorrect = true;
    const mdCorrectLetters = mdQuestion.correctLetters;
    
    // Check each option in HTML against markdown
    htmlQuestion.options.forEach(htmlOption => {
      const shouldBeCorrect = mdCorrectLetters.includes(htmlOption.letter);
      
      if (htmlOption.isCorrect !== shouldBeCorrect) {
        console.error(`❌ Incorrect data-correct value in ${quizName} Q${mdQuestion.number} option ${htmlOption.letter}`);
        results.quizResults[quizName].issues.push({
          question: mdQuestion.number,
          type: 'Incorrect data-correct',
          details: `Option ${htmlOption.letter} should be ${shouldBeCorrect ? 'correct' : 'incorrect'}`
        });
        allCorrect = false;
        results.issuesByCategory['Inconsistent Answers']++;
      }
    });
    
    // Check for correct answers not found in HTML
    mdCorrectLetters.forEach(letter => {
      if (!htmlQuestion.options.some(o => o.letter === letter)) {
        console.error(`❌ Correct answer ${letter} from markdown not found in HTML for ${quizName} Q${mdQuestion.number}`);
        results.quizResults[quizName].issues.push({
          question: mdQuestion.number,
          type: 'Missing Option',
          details: `Correct answer ${letter} from markdown not found in HTML`
        });
        allCorrect = false;
        results.issuesByCategory['Markdown/HTML Mismatch']++;
      }
    });
    
    // Update passing count
    if (allCorrect) {
      results.questionsPassing++;
      results.quizResults[quizName].passing++;
    }
  });
}

/**
 * Print a summary of findings
 */
function printSummary() {
  console.log("\n======== CORRECT ANSWER VALIDATION SUMMARY ========");
  console.log(`Total quizzes: ${results.totalQuizzes}`);
  console.log(`Total questions: ${results.totalQuestions}`);
  console.log(`Questions with correct 'data-correct' values: ${results.questionsPassing} (${Math.round(results.questionsPassing/results.totalQuestions*100)}%)`);
  
  console.log("\n======== ISSUES BY CATEGORY ========");
  for (const [category, count] of Object.entries(results.issuesByCategory)) {
    if (count > 0) {
      console.log(`- ${category}: ${count} issues`);
    }
  }
  
  console.log("\n======== QUIZ RESULTS ========");
  let perfectQuizzes = 0;
  
  for (const [quizName, result] of Object.entries(results.quizResults)) {
    const passPercentage = Math.round(result.passing/result.questions*100) || 0;
    
    if (result.issues.length === 0) {
      console.log(`✅ ${quizName}: All ${result.questions} questions validated (100%)`);
      perfectQuizzes++;
    } else {
      console.log(`❌ ${quizName}: ${result.passing}/${result.questions} questions validated (${passPercentage}%)`);
      
      // Group issues by type
      const issuesByType = {};
      result.issues.forEach(issue => {
        const type = issue.type;
        if (!issuesByType[type]) {
          issuesByType[type] = [];
        }
        issuesByType[type].push(issue);
      });
      
      // Print issues by type
      Object.entries(issuesByType).forEach(([type, issues]) => {
        console.log(`  - ${type}: ${issues.length} issues`);
        if (issues.length <= 3) { // Show details for a small number of issues
          issues.forEach(issue => {
            if (issue.question) {
              console.log(`    * Q${issue.question}: ${issue.details}`);
            } else {
              console.log(`    * ${issue.details}`);
            }
          });
        }
      });
    }
  }
  
  console.log(`\nPerfect quizzes: ${perfectQuizzes}/${results.totalQuizzes} (${Math.round(perfectQuizzes/results.totalQuizzes*100)}%)`);
  
  console.log("\n======== RECOMMENDATIONS ========");
  if (results.questionsPassing < results.totalQuestions) {
    console.log("1. Fix markdown files to use the standard **Correct Answers:** A, B, C format");
    console.log("2. Run the build.js script to regenerate HTML files");
    console.log("3. Ensure that markdown options have letter prefixes (A, B, C, etc.)");
    console.log("4. Check that the correct answers list matches question options");
  } else {
    console.log("All questions have correct answer designations!");
  }
}

// Run the validation
validateAllQuizzes();