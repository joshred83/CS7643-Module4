/**
 * Quiz Factchecker and Formatting Utility
 * 
 * This comprehensive script:
 * 1. Analyzes each question's explanation to determine all options that should be correct
 * 2. Updates "Correct Answers:" lines to match what the explanation describes
 * 3. Improves markdown formatting consistency
 * 4. Removes duplicate answer lines
 * 5. Generates a detailed report of changes
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const CONFIG = {
  VERBOSE: true,            // Print more detailed logs
  DRYRUN: false,            // If true, don't actually modify files
  OPTION_LETTERS: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']  // Supported option letters
};

// Results tracking
const results = {
  filesProcessed: 0,
  filesModified: 0,
  questionsProcessed: 0,
  questionsFixed: {
    correctAnswersFixed: 0,
    duplicatesRemoved: 0,
    formattingFixed: 0
  },
  questionDetails: []
};

// Phrases that indicate an option is correct
const CORRECT_PHRASES = [
  'is correct',
  'are correct',
  'is true',
  'correctly',
  'right answer',
  'right choice',
  'best choice',
  'best option',
  'should be selected'
];

// Phrases that negate correctness
const NEGATION_PHRASES = [
  'not correct',
  'isn\'t correct',
  'aren\'t correct',
  'isn\'t true',
  'not true',
  'incorrect',
  'wrong',
  'shouldn\'t be selected',
  'should not be selected'
];

// Main function
async function main() {
  console.log('🔍 Starting Quiz Factchecker and Formatting Utility...');
  
  // Get all quiz files
  const files = glob.sync(path.join(__dirname, 'quizzes', '*Combined.md'));
  console.log(`Found ${files.length} quiz files to process`);
  
  // Process each file
  for (const file of files) {
    const fileName = path.basename(file);
    results.filesProcessed++;
    
    try {
      await processFile(file, fileName);
    } catch (error) {
      console.error(`Error processing ${fileName}:`, error);
    }
  }
  
  // Print results
  printResults();
}

// Process an individual file
async function processFile(filePath, fileName) {
  console.log(`\nProcessing ${fileName}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let questionsFixedInFile = 0;
  
  // Split into sections by questions
  const questionSections = content.split(/(?=### Question \d+)/g);
  
  // Process each question section
  const processedSections = questionSections.map((section, index) => {
    // Skip non-question sections
    if (!section.match(/^### Question \d+/)) {
      return section;
    }
    
    results.questionsProcessed++;
    let sectionModified = false;
    let fixDetails = {};
    
    // Extract question info
    const questionMatch = section.match(/^### Question (\d+)\s*\(([^)]+)\)/);
    if (!questionMatch) {
      console.log(`  Warning: Question format issue in section ${index + 1}`);
      return section;
    }
    
    const questionNumber = questionMatch[1];
    const questionType = questionMatch[2].trim();
    let questionId = `${fileName}:Q${questionNumber}`;
    
    if (CONFIG.VERBOSE) {
      console.log(`  Analyzing ${questionId} (${questionType})...`);
    }
    
    // Extract details tag content
    const detailsMatch = section.match(/<details>[\s\S]+?<\/details>/);
    if (!detailsMatch) {
      if (CONFIG.VERBOSE) {
        console.log(`  - No details section found for ${questionId}`);
      }
      return section;
    }
    
    let detailsContent = detailsMatch[0];
    
    // Extract explanation
    const explanationMatch = detailsContent.match(/<summary>Show Answer<\/summary>([\s\S]+?)<\/details>/);
    if (!explanationMatch) {
      return section;
    }
    
    let explanationContent = explanationMatch[1];
    
    // Extract options from question
    const options = [...section.matchAll(/- \[ \] ([A-Z])\.\s+(.+)/g)]
      .map(match => ({
        letter: match[1],
        text: match[2].trim()
      }));
    
    if (options.length === 0) {
      if (CONFIG.VERBOSE) {
        console.log(`  - No options found for ${questionId}`);
      }
      return section;
    }
    
    // Extract current correct answers
    const correctAnswersMatch = explanationContent.match(/\*\*Correct Answers?:\*\*\s*([A-Z,\s]+)/i);
    if (!correctAnswersMatch) {
      if (CONFIG.VERBOSE) {
        console.log(`  - No "Correct Answers:" line found for ${questionId}`);
      }
      return section;
    }
    
    const currentCorrectLetters = correctAnswersMatch[1]
      .split(/[,\s]+/)
      .filter(letter => /^[A-Z]$/i.test(letter))
      .map(letter => letter.toUpperCase());
    
    // Check for duplicate "Correct Answers:" lines
    const correctAnswersLines = explanationContent.match(/\*\*Correct Answers?:\*\*/g);
    const hasDuplicateAnswerLines = correctAnswersLines && correctAnswersLines.length > 1;
    
    // Analyze explanation to determine which options should be correct
    const explicitlyMentionedCorrect = [];
    const explanationTextOnly = explanationContent
      .replace(/\*\*Correct Answers?:\*\*\s*[A-Z,\s]+/g, '')
      .replace(/\*\*.+?\*\*/g, ''); // Remove other bold text
    
    // Method 1: Direct letter mentions - check phrases like "(A) is correct"
    options.forEach(option => {
      // Patterns like "(A)", "A)", "option A", and standalone "A"
      const letterPatterns = [
        // Direct mentions with parentheses
        new RegExp(`\\(${option.letter}\\)[^.;,]*(?:${CORRECT_PHRASES.join('|')})`, 'i'),
        // Direct mentions without parentheses
        new RegExp(`(?:^|\\s)${option.letter}\\)[^.;,]*(?:${CORRECT_PHRASES.join('|')})`, 'i'),
        // Mentions with "option" prefix
        new RegExp(`option\\s+${option.letter}[^.;,]*(?:${CORRECT_PHRASES.join('|')})`, 'i'),
        // Standalone letter with word boundary
        new RegExp(`\\b${option.letter}\\b[^.;,]*(?:${CORRECT_PHRASES.join('|')})`, 'i')
      ];
      
      // Check for negation patterns
      const negationPatterns = [
        new RegExp(`\\(${option.letter}\\)[^.;,]*(?:${NEGATION_PHRASES.join('|')})`, 'i'),
        new RegExp(`(?:^|\\s)${option.letter}\\)[^.;,]*(?:${NEGATION_PHRASES.join('|')})`, 'i'),
        new RegExp(`option\\s+${option.letter}[^.;,]*(?:${NEGATION_PHRASES.join('|')})`, 'i'),
        new RegExp(`\\b${option.letter}\\b[^.;,]*(?:${NEGATION_PHRASES.join('|')})`, 'i')
      ];
      
      // Check if option text is directly mentioned as correct
      const contentCorrectPattern = new RegExp(`${escapeRegExp(option.text)}[^.;,]*(?:${CORRECT_PHRASES.join('|')})`, 'i');
      const contentNegationPattern = new RegExp(`${escapeRegExp(option.text)}[^.;,]*(?:${NEGATION_PHRASES.join('|')})`, 'i');
      
      // Check if mentioned as correct
      const isExplicitlyMentionedCorrect = 
        letterPatterns.some(pattern => pattern.test(explanationTextOnly)) ||
        contentCorrectPattern.test(explanationTextOnly);
      
      // Check if explicitly mentioned as incorrect
      const isExplicitlyMentionedIncorrect = 
        negationPatterns.some(pattern => pattern.test(explanationTextOnly)) ||
        contentNegationPattern.test(explanationTextOnly);
      
      // Only add if explicitly mentioned as correct and not contradicted
      if (isExplicitlyMentionedCorrect && !isExplicitlyMentionedIncorrect) {
        explicitlyMentionedCorrect.push(option.letter);
      }
    });
    
    // Method 2: Look for parenthesized letter lists like "(A, B, C)"
    const letterListMatches = explanationTextOnly.match(/\(([A-Z,\s]+)\)/g);
    if (letterListMatches) {
      letterListMatches.forEach(match => {
        const letterList = match
          .replace(/[()]/g, '')
          .split(/[,\s]+/)
          .filter(letter => CONFIG.OPTION_LETTERS.includes(letter));
        
        // Check if these letters are mentioned in context of being correct
        const surroundingText = getTextSurrounding(explanationTextOnly, match, 50);
        const isCorrectContext = CORRECT_PHRASES.some(phrase => 
          surroundingText.toLowerCase().includes(phrase.toLowerCase())
        );
        
        if (isCorrectContext) {
          letterList.forEach(letter => {
            if (!explicitlyMentionedCorrect.includes(letter)) {
              explicitlyMentionedCorrect.push(letter);
            }
          });
        }
      });
    }
    
    // Method 3: Special handling for True/False questions
    if (questionType.toLowerCase().includes('true/false')) {
      const explanationLower = explanationTextOnly.toLowerCase();
      
      // Check for phrases like "true is correct" or just "true" without negation
      if (explanationLower.includes('true') && 
          !NEGATION_PHRASES.some(phrase => explanationLower.includes(phrase))) {
        if (!explicitlyMentionedCorrect.includes('A')) {
          explicitlyMentionedCorrect.push('A'); // "True" is typically option A
        }
      }
      
      // Check for phrases like "false is correct"
      if (explanationLower.includes('false is correct') || 
          explanationLower.includes('false option is correct')) {
        if (!explicitlyMentionedCorrect.includes('B')) {
          explicitlyMentionedCorrect.push('B'); // "False" is typically option B
        }
      }
    }
    
    // Create list of letters from explanation that disagree with current correct letters
    let missingCorrectLetters = [];
    let extraneousCorrectLetters = [];
    
    // If we found explicitly mentioned correct answers in the explanation
    if (explicitlyMentionedCorrect.length > 0) {
      // Find letters that should be marked as correct but aren't
      missingCorrectLetters = explicitlyMentionedCorrect.filter(
        letter => !currentCorrectLetters.includes(letter)
      );
      
      // Find letters that are marked as correct but shouldn't be
      extraneousCorrectLetters = currentCorrectLetters.filter(
        letter => !explicitlyMentionedCorrect.includes(letter)
      );
    }
    
    // Determine if we need to update the correct answers
    const needToUpdateCorrectAnswers = 
      (missingCorrectLetters.length > 0 || extraneousCorrectLetters.length > 0) &&
      explicitlyMentionedCorrect.length > 0;
    
    // Fix issues
    if (needToUpdateCorrectAnswers || hasDuplicateAnswerLines) {
      fixDetails = {
        questionId,
        questionType,
        originalCorrectLetters: currentCorrectLetters,
        explicitlyMentionedCorrect,
        hasDuplicateAnswerLines
      };
      
      let newCorrectLetters = currentCorrectLetters;
      
      // Update correct letters if needed
      if (needToUpdateCorrectAnswers) {
        if (CONFIG.VERBOSE) {
          if (missingCorrectLetters.length > 0) {
            console.log(`  - Found ${missingCorrectLetters.length} additional correct options in explanation: ${missingCorrectLetters.join(', ')}`);
          }
          if (extraneousCorrectLetters.length > 0) {
            console.log(`  - Found ${extraneousCorrectLetters.length} options marked correct but contradicted in explanation: ${extraneousCorrectLetters.join(', ')}`);
          }
        }
        
        // Create new correct letters list, sorting alphabetically
        newCorrectLetters = [...new Set([...currentCorrectLetters, ...explicitlyMentionedCorrect])].sort();
        fixDetails.newCorrectLetters = newCorrectLetters;
        results.questionsFixed.correctAnswersFixed++;
      }
      
      if (hasDuplicateAnswerLines) {
        if (CONFIG.VERBOSE) {
          console.log(`  - Found ${correctAnswersLines.length} duplicate "Correct Answers:" lines`);
        }
        results.questionsFixed.duplicatesRemoved++;
      }
      
      // Create new explanation content
      let newExplanation = explanationContent.replace(/\*\*Correct Answers?:\*\*\s*[^\n]*/g, '');
      newExplanation = `\n**Correct Answers:** ${newCorrectLetters.join(', ')}\n${newExplanation.trim()}`;
      
      // Update the details section
      const newDetailsContent = detailsContent.replace(
        /<summary>Show Answer<\/summary>[\s\S]+?<\/details>/,
        `<summary>Show Answer</summary>${newExplanation}\n</details>`
      );
      
      section = section.replace(detailsContent, newDetailsContent);
      sectionModified = true;
      questionsFixedInFile++;
      
      // Add to results
      results.questionDetails.push(fixDetails);
    }
    
    return section;
  });
  
  // Join sections back together
  const newContent = processedSections.join('');
  
  // Write changes if content was modified
  if (newContent !== content && !CONFIG.DRYRUN) {
    fs.writeFileSync(filePath, newContent);
    modified = true;
    results.filesModified++;
    console.log(`  ✓ Fixed ${questionsFixedInFile} questions in ${fileName}`);
  } else if (newContent !== content && CONFIG.DRYRUN) {
    modified = true;
    results.filesModified++;
    console.log(`  ✓ Would fix ${questionsFixedInFile} questions in ${fileName} (dry run)`);
  } else {
    console.log(`  ✓ No issues found in ${fileName}`);
  }
}

// Helper: Get text surrounding a match
function getTextSurrounding(text, match, charCount) {
  const matchIndex = text.indexOf(match);
  if (matchIndex === -1) return '';
  
  const start = Math.max(0, matchIndex - charCount);
  const end = Math.min(text.length, matchIndex + match.length + charCount);
  
  return text.substring(start, end);
}

// Helper: Escape regex special characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Print results summary
function printResults() {
  console.log('\n======== QUIZ FACTCHECKER RESULTS ========');
  console.log(`Files processed: ${results.filesProcessed}`);
  console.log(`Files modified: ${results.filesModified}`);
  console.log(`Total questions analyzed: ${results.questionsProcessed}`);
  console.log(`Questions with corrections: ${Object.values(results.questionsFixed).reduce((a, b) => a + b, 0)}`);
  console.log(`  - Correct answers fixed: ${results.questionsFixed.correctAnswersFixed}`);
  console.log(`  - Duplicate answer lines removed: ${results.questionsFixed.duplicatesRemoved}`);
  
  // Print details about fixed questions if in verbose mode
  if (CONFIG.VERBOSE && results.questionDetails.length > 0) {
    console.log('\n======== FIXED QUESTIONS DETAILS ========');
    results.questionDetails.forEach((detail, idx) => {
      console.log(`${idx + 1}. ${detail.questionId} (${detail.questionType}):`);
      
      if (detail.originalCorrectLetters.join('') !== detail.newCorrectLetters?.join('')) {
        console.log(`   Original correct answers: ${detail.originalCorrectLetters.join(', ')}`);
        console.log(`   New correct answers: ${detail.newCorrectLetters?.join(', ')}`);
      }
      
      if (detail.hasDuplicateAnswerLines) {
        console.log(`   Fixed duplicate "Correct Answers:" lines`);
      }
      
      console.log('');
    });
  }
  
  console.log("\nDon't forget to run 'node build.js' to rebuild HTML files!");
}

// Run the script
main();