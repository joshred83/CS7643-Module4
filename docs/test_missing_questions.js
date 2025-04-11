/**
 * Test for Missing or Duplicate Questions in Quiz Files
 * 
 * This script ensures that:
 * 1. All quiz files have sequential question numbers (no gaps or duplicates)
 * 2. Question numbers should start from 1 and go up to the expected count
 * 3. Each file has the expected mix of question types (configurable)
 * 
 * Run this script to detect and report issues with quiz numbering.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const CONFIG = {
  // Expected question types distribution (percentages)
  EXPECTED_TYPES: {
    'True/False': { min: 15, max: 30 },
    'Multiple Choice': { min: 15, max: 30 },
    'Multi-Select': { min: 40, max: 70 }
  },
  // Minimum number of questions per file
  MIN_QUESTIONS: 8,
  // Log level (1 = errors only, 2 = warnings, 3 = all info)
  LOG_LEVEL: 3
};

// Results tracking
const results = {
  files: 0,
  totalQuestions: 0,
  questionsByType: {},
  filesWithIssues: 0,
  issues: []
};

/**
 * Main function to check all quiz files
 */
function checkAllQuizFiles() {
  console.log("🔍 Checking for missing or duplicate questions in quiz files...");
  
  // Get all quiz markdown files
  const files = glob.sync(path.join(__dirname, 'quizzes/*Combined.md'));
  results.files = files.length;
  
  console.log(`Found ${files.length} quiz files to check\n`);
  
  // Initialize question type counters
  Object.keys(CONFIG.EXPECTED_TYPES).forEach(type => {
    results.questionsByType[type] = 0;
  });
  
  // Process each file
  files.forEach(filePath => checkQuizFile(filePath));
  
  // Print summary
  printSummary();
}

/**
 * Check a single quiz file for question sequence issues
 */
function checkQuizFile(filePath) {
  const fileName = path.basename(filePath);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const quizTitle = content.match(/^# Quiz:\s*(.+)$/m)?.[1] || fileName;
    
    // Find all question headers
    const questionMatches = [...content.matchAll(/^### Question (\d+)\s*\(([^)]+)\)/gm)];
    
    if (questionMatches.length === 0) {
      log(`No properly formatted questions found in ${fileName}`, 1);
      results.issues.push({
        file: fileName,
        type: 'Missing Questions',
        details: 'No properly formatted questions found'
      });
      results.filesWithIssues++;
      return;
    }
    
    // Extract question numbers and types
    const questions = questionMatches.map(match => ({
      number: parseInt(match[1], 10),
      type: match[2].trim()
    }));
    
    // Count questions per type
    const typeCounts = {};
    questions.forEach(q => {
      const normalizedType = normalizeQuestionType(q.type);
      typeCounts[normalizedType] = (typeCounts[normalizedType] || 0) + 1;
      results.questionsByType[normalizedType] = (results.questionsByType[normalizedType] || 0) + 1;
    });
    
    results.totalQuestions += questions.length;
    
    // Check for expected question count
    if (questions.length < CONFIG.MIN_QUESTIONS) {
      log(`${fileName} has only ${questions.length} questions (expected at least ${CONFIG.MIN_QUESTIONS})`, 2);
      results.issues.push({
        file: fileName,
        type: 'Question Count',
        details: `Only ${questions.length} questions (expected at least ${CONFIG.MIN_QUESTIONS})`
      });
    }
    
    // Check for non-sequential questions
    const questionNumbers = questions.map(q => q.number).sort((a, b) => a - b);
    const expectedSequence = Array.from({length: questionNumbers.length}, (_, i) => i + 1);
    
    // Find missing numbers
    const missing = expectedSequence.filter(num => !questionNumbers.includes(num));
    
    // Find duplicates
    const duplicates = questionNumbers.filter((num, idx, arr) => arr.indexOf(num) !== idx);
    
    // Check if questions are out of order
    const outOfOrder = !questionNumbers.every((num, idx) => idx === 0 || num > questionNumbers[idx - 1]);
    
    let hasIssues = false;
    
    if (missing.length > 0) {
      log(`${fileName} is missing question numbers: ${missing.join(', ')}`, 1);
      results.issues.push({
        file: fileName,
        type: 'Missing Question Numbers',
        details: `Missing numbers: ${missing.join(', ')}`
      });
      hasIssues = true;
    }
    
    if (duplicates.length > 0) {
      log(`${fileName} has duplicate question numbers: ${[...new Set(duplicates)].join(', ')}`, 1);
      results.issues.push({
        file: fileName,
        type: 'Duplicate Question Numbers',
        details: `Duplicate numbers: ${[...new Set(duplicates)].join(', ')}`
      });
      hasIssues = true;
    }
    
    if (outOfOrder) {
      log(`${fileName} has out-of-order question numbers`, 2);
      results.issues.push({
        file: fileName,
        type: 'Question Order',
        details: 'Questions are not in sequential order'
      });
      hasIssues = true;
    }
    
    // Check question type distribution
    Object.entries(CONFIG.EXPECTED_TYPES).forEach(([type, range]) => {
      const count = typeCounts[type] || 0;
      const percentage = (count / questions.length) * 100;
      
      if (percentage < range.min) {
        log(`${fileName} has too few ${type} questions (${percentage.toFixed(1)}%, expected >=${range.min}%)`, 2);
        results.issues.push({
          file: fileName,
          type: 'Question Type Distribution',
          details: `Too few ${type} questions (${count}/${questions.length}, ${percentage.toFixed(1)}%)`
        });
        hasIssues = true;
      } else if (percentage > range.max) {
        log(`${fileName} has too many ${type} questions (${percentage.toFixed(1)}%, expected <=${range.max}%)`, 2);
        results.issues.push({
          file: fileName,
          type: 'Question Type Distribution',
          details: `Too many ${type} questions (${count}/${questions.length}, ${percentage.toFixed(1)}%)`
        });
        hasIssues = true;
      }
    });
    
    // Log success or increment count of files with issues
    if (hasIssues) {
      results.filesWithIssues++;
    } else {
      log(`✅ ${fileName} has sequential questions with proper type distribution`, 3);
    }
    
  } catch (error) {
    log(`Error processing ${fileName}: ${error.message}`, 1);
    results.issues.push({
      file: fileName,
      type: 'Processing Error',
      details: error.message
    });
    results.filesWithIssues++;
  }
}

/**
 * Normalize question type to match expected types
 */
function normalizeQuestionType(type) {
  type = type.toLowerCase();
  
  if (type.includes('true') && type.includes('false')) {
    return 'True/False';
  } else if (type.includes('multiple choice')) {
    return 'Multiple Choice';
  } else if (type.includes('multi-select') || type.includes('multiple select')) {
    return 'Multi-Select';
  } else {
    return 'Other';
  }
}

/**
 * Log message based on configured log level
 */
function log(message, level = 3) {
  if (level <= CONFIG.LOG_LEVEL) {
    if (level === 1) {
      console.error(`❌ ${message}`);
    } else if (level === 2) {
      console.warn(`⚠️ ${message}`);
    } else {
      console.log(`ℹ️ ${message}`);
    }
  }
}

/**
 * Print a summary of findings
 */
function printSummary() {
  console.log("\n======== QUESTION ANALYSIS SUMMARY ========");
  console.log(`Total quiz files: ${results.files}`);
  console.log(`Files with sequence issues: ${results.filesWithIssues}`);
  console.log(`Total questions across all files: ${results.totalQuestions}`);
  
  console.log("\nQuestion type distribution:");
  Object.entries(results.questionsByType).forEach(([type, count]) => {
    const percentage = (count / results.totalQuestions) * 100;
    console.log(`- ${type}: ${count} (${percentage.toFixed(1)}%)`);
  });
  
  if (results.issues.length > 0) {
    console.log("\n======== DETAILED ISSUES ========");
    
    // Group issues by file
    const issuesByFile = {};
    results.issues.forEach(issue => {
      if (!issuesByFile[issue.file]) {
        issuesByFile[issue.file] = [];
      }
      issuesByFile[issue.file].push(issue);
    });
    
    // Print issues by file
    Object.entries(issuesByFile).forEach(([file, issues]) => {
      console.log(`\nIssues in ${file}:`);
      issues.forEach(issue => {
        console.log(`  - ${issue.type}: ${issue.details}`);
      });
    });
  }
  
  console.log("\n======== RECOMMENDATIONS ========");
  if (results.filesWithIssues > 0) {
    console.log("1. Fix missing or duplicate question numbers");
    console.log("2. Ensure questions are in sequential order");
    console.log("3. Adjust question type distribution to match expected ranges");
    console.log("4. Run the standardize_markdown.js script to fix formatting issues");
  } else {
    console.log("All quiz files have properly sequenced questions!");
  }
}

// Run the check
checkAllQuizFiles();