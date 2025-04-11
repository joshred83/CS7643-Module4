/**
 * Comprehensive Quiz Repair Script
 * 
 * This script:
 * 1. Adds proper quiz titles to all files
 * 2. Ensures all Multiple Choice questions have exactly one correct answer
 * 3. Fixes inconsistencies between correct answers and explanations
 * 4. Standardizes formatting across all quiz files
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Quiz titles mapping
const QUIZ_TITLES = {
  '13.1': 'Generative Models Introduction',
  '13.1-': 'Generative Models Introduction',
  '13.2': 'PixelRNN & PixelCNN',
  '13.3': 'Generative Adversarial Networks (GANs)',
  '13.4': 'Variational Autoencoders (VAEs)',
  '17.1': 'Reinforcement Learning Introduction',
  '17.2': 'Markov Decision Processes',
  '17.3': 'Algorithms for Solving MDPs',
  '17.4': 'Deep Q-Learning',
  '17.4-': 'Deep Q-Learning',
  '17.5': 'Policy Gradients, Actor-Critic',
  '18.1': 'Advanced Topics Introduction',
  '18.2': 'Semi-Supervised Learning',
  '18.3': 'Few-Shot Learning',
  '18.4': 'Unsupervised and Self-Supervised Learning',
};

// Problem patterns
const MULTIPLE_CHOICE_REGEX = /Question \d+\s*\(Multiple Choice\)/i;
const CORRECT_ANSWERS_REGEX = /\*\*Correct Answers?:\*\*\s*([A-Z,\s]+)/i;
const FIX_PATTERNS = [
  // Special cases where explanations clearly indicate different answers than what's marked
  {
    file: '13.2Combined.md',
    question: 6,
    correctAnswers: 'C',
    description: 'Changed from A, B, D to C based on explanation text'
  },
  {
    file: '13.2Combined.md',
    question: 7,
    correctAnswers: 'B',
    description: 'Changed from A to B based on explanation text'
  }
  // Add more specific fixes here if needed
];

// Results tracking
const results = {
  filesProcessed: 0,
  titlesAdded: 0,
  multipleChoiceFixed: 0,
  specificFixes: 0,
  otherFixes: 0
};

// Main function
async function main() {
  console.log("🔧 Starting comprehensive quiz repair...");
  
  // Get all quiz markdown files
  const files = glob.sync(path.join(__dirname, 'quizzes', '*Combined.md'));
  console.log(`Found ${files.length} Combined.md files to process`);
  
  // Process each file
  for (const file of files) {
    await processFile(file);
  }
  
  // Print summary
  console.log("\n======== REPAIR SUMMARY ========");
  console.log(`Files processed: ${results.filesProcessed}`);
  console.log(`Quiz titles added: ${results.titlesAdded}`);
  console.log(`Multiple Choice questions fixed: ${results.multipleChoiceFixed}`);
  console.log(`Specific known issues fixed: ${results.specificFixes}`);
  console.log(`Other formatting fixes: ${results.otherFixes}`);
  console.log("\nDon't forget to run 'node build.js' to rebuild HTML files!");
}

// Process an individual file
async function processFile(filePath) {
  const fileName = path.basename(filePath);
  console.log(`\nProcessing ${fileName}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  results.filesProcessed++;
  
  // 1. Add quiz title if missing
  if (!content.match(/^# Quiz:/m)) {
    // Find appropriate title from the mapping
    let title = 'Quiz';
    for (const [key, value] of Object.entries(QUIZ_TITLES)) {
      if (fileName.startsWith(key)) {
        title = value;
        break;
      }
    }
    
    // Add the title at the beginning
    content = `# Quiz: ${title}\n\n${content}`;
    console.log(`  ✓ Added quiz title: "${title}"`);
    modified = true;
    results.titlesAdded++;
  }
  
  // Split into sections
  const sections = content.split(/(?=### Question \d+)/g);
  
  // First section might just be the title
  const processedSections = sections.map((section, index) => {
    // Skip if not a question section
    if (!section.match(/^### Question \d+/)) {
      return section;
    }
    
    // 2. Get question number and type
    const headerMatch = section.match(/^### Question (\d+)\s*\(([^)]+)\)/);
    if (!headerMatch) {
      return section;
    }
    
    const questionNumber = parseInt(headerMatch[1]);
    const questionType = headerMatch[2].trim();
    
    // Find <details> section
    const detailsMatch = section.match(/<details>[\s\S]+?<\/details>/);
    if (!detailsMatch) {
      return section;
    }
    
    let detailsContent = detailsMatch[0];
    let sectionModified = false;
    
    // 3. Check for specific fixes
    const specificFix = FIX_PATTERNS.find(pattern => 
      fileName === pattern.file && questionNumber === pattern.question
    );
    
    if (specificFix) {
      // Apply specific fix
      console.log(`  ✓ Applying specific fix to Question ${questionNumber}: ${specificFix.description}`);
      
      // Update the correct answers line
      const newDetailsContent = detailsContent.replace(
        CORRECT_ANSWERS_REGEX,
        `**Correct Answers:** ${specificFix.correctAnswers}`
      );
      
      if (newDetailsContent !== detailsContent) {
        detailsContent = newDetailsContent;
        sectionModified = true;
        results.specificFixes++;
      }
    }
    // 4. Fix Multiple Choice questions with multiple answers
    else if (questionType.match(/Multiple Choice/i)) {
      const correctAnswersMatch = detailsContent.match(CORRECT_ANSWERS_REGEX);
      
      if (correctAnswersMatch) {
        const correctLetters = correctAnswersMatch[1]
          .split(/[,\s]+/)
          .filter(letter => /^[A-Z]$/.test(letter));
        
        // If more than one correct answer, keep only the first one
        if (correctLetters.length > 1) {
          console.log(`  ✓ Fixing Multiple Choice Question ${questionNumber}: Reducing ${correctLetters.length} correct answers to 1`);
          
          // Update the correct answers line to only include the first letter
          const newDetailsContent = detailsContent.replace(
            CORRECT_ANSWERS_REGEX,
            `**Correct Answers:** ${correctLetters[0]}`
          );
          
          if (newDetailsContent !== detailsContent) {
            detailsContent = newDetailsContent;
            sectionModified = true;
            results.multipleChoiceFixed++;
          }
        }
      }
    }
    
    // 5. Fix duplicate "Correct Answers:" lines
    const correctAnswersLines = detailsContent.match(/\*\*Correct Answers?:\*\*/g);
    if (correctAnswersLines && correctAnswersLines.length > 1) {
      // Get the correct answers from the first line
      const correctAnswersMatch = detailsContent.match(/\*\*Correct Answers?:\*\*\s*([A-Z,\s]+)/i);
      if (correctAnswersMatch) {
        const correctLetters = correctAnswersMatch[1]
          .split(/[,\s]+/)
          .filter(letter => /^[A-Z]$/.test(letter));
        
        // Remove all "Correct Answers:" lines
        let cleanContent = detailsContent.replace(/\*\*Correct Answers?:\*\*\s*[^\n]*/g, '');
        
        // Add back one clean line at the beginning
        cleanContent = cleanContent.replace(/<summary>Show Answer<\/summary>\s*\n/, 
          `<summary>Show Answer</summary>\n\n**Correct Answers:** ${correctLetters.join(', ')}\n`
        );
        
        if (cleanContent !== detailsContent) {
          detailsContent = cleanContent;
          sectionModified = true;
          results.otherFixes++;
        }
      }
    }
    
    // 6. Replace the details section if modified
    if (sectionModified) {
      section = section.replace(/<details>[\s\S]+?<\/details>/, detailsContent);
      modified = true;
    }
    
    return section;
  });
  
  // Join sections back together
  const processedContent = processedSections.join('');
  
  // Save if modified
  if (modified) {
    fs.writeFileSync(filePath, processedContent);
    console.log(`  ✓ Saved changes to ${fileName}`);
  } else {
    console.log(`  ✓ No changes needed for ${fileName}`);
  }
}

// Run the script
main();