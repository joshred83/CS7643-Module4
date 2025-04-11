/**
 * Script to analyze question types across all quiz files
 */
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all quiz files
const quizFiles = glob.sync(path.join(__dirname, 'quizzes/*Combined.md'));

// Sort files
quizFiles.sort();

// Results container 
const results = {
  totalQuestions: 0,
  multiSelect: 0,
  multipleChoice: 0,
  multipleSelect: 0,
  trueFalse: 0,
  otherTypes: [],
  fileStats: {}
};

// Process each file
quizFiles.forEach(file => {
  const fileName = path.basename(file);
  const content = fs.readFileSync(file, 'utf8');
  
  // Setup file stats
  results.fileStats[fileName] = {
    total: 0,
    multiSelect: 0,
    multipleChoice: 0,
    multipleSelect: 0,
    trueFalse: 0,
    otherTypes: []
  };
  
  // Find all question sections
  const sections = content.split(/(?=#{3}\s+Question \d+)/g).filter(s => s.trim().length > 0);
  
  sections.forEach(section => {
    // Extract question header
    const headerMatch = section.match(/#{3}\s+Question \d+\s*\(([^)]+)\)/);
    if (!headerMatch) return;
    
    const questionType = headerMatch[1].trim();
    results.fileStats[fileName].total++;
    results.totalQuestions++;
    
    // Count by type using more precise patterns
    if (/multi-select/i.test(questionType)) {
      results.fileStats[fileName].multiSelect++;
      results.multiSelect++;
    } else if (/multiple select/i.test(questionType)) {
      results.fileStats[fileName].multipleSelect++;
      results.multipleSelect++;
    } else if (/multiple choice/i.test(questionType)) {
      results.fileStats[fileName].multipleChoice++;
      results.multipleChoice++;
    } else if (/true[\/\s-]false/i.test(questionType)) {
      results.fileStats[fileName].trueFalse++;
      results.trueFalse++;
    } else {
      results.fileStats[fileName].otherTypes.push(questionType);
      results.otherTypes.push({file: fileName, type: questionType});
    }
    
    // Count answer options to verify if multi-select
    const optionMatches = [...section.matchAll(/- \[ \] ([A-Z])\.\s+(.+)/g)];
    
    // Get correct answers from the details section
    const detailsMatch = section.match(/<details>[\s\S]+?<summary>Show Answer<\/summary>([\s\S]+?)<\/details>/);
    if (detailsMatch) {
      const explanation = detailsMatch[1];
      const correctAnswersMatch = explanation.match(/\*\*Correct Answers?:\*\*\s+([A-Z,\s]+)/i);
      
      if (correctAnswersMatch) {
        const correctLetters = correctAnswersMatch[1]
          .split(/[,\s]+/)
          .filter(letter => /^[A-Z]$/.test(letter));
          
        if (correctLetters.length > 1 && !/multi/i.test(questionType)) {
          // Question has multiple correct answers but isn't labeled as multi-select
          results.fileStats[fileName].otherTypes.push(`${questionType} (but has ${correctLetters.length} correct answers)`);
        }
      }
    }
  });
});

// Print detailed results
console.log("========== QUESTION TYPE ANALYSIS ==========\n");

// Print file-by-file stats
console.log("File-by-file analysis:");
console.log("----------------------------------------");
console.log("File | Total | Multi-Select | Multiple Select | Multiple Choice | True/False | Other");
console.log("----------------------------------------");

Object.entries(results.fileStats).forEach(([fileName, stats]) => {
  const msPercent = stats.total > 0 ? Math.round((stats.multiSelect + stats.multipleSelect) / stats.total * 100) : 0;
  const mcPercent = stats.total > 0 ? Math.round(stats.multipleChoice / stats.total * 100) : 0;
  const tfPercent = stats.total > 0 ? Math.round(stats.trueFalse / stats.total * 100) : 0;
  const otherCount = stats.otherTypes.length;
  
  console.log(`${fileName} | ${stats.total} | ${stats.multiSelect} | ${stats.multipleSelect} | ${stats.multipleChoice} (${mcPercent}%) | ${stats.trueFalse} (${tfPercent}%) | ${otherCount}`);
  
  // Print other types for this file if any
  if (otherCount > 0) {
    console.log(`  Other types in ${fileName}:`);
    stats.otherTypes.forEach(type => {
      console.log(`  - ${type}`);
    });
  }
});

// Print overall summary
console.log("\n========== OVERALL SUMMARY ==========");
const msPercent = Math.round((results.multiSelect + results.multipleSelect) / results.totalQuestions * 100);
const mcPercent = Math.round(results.multipleChoice / results.totalQuestions * 100);
const tfPercent = Math.round(results.trueFalse / results.totalQuestions * 100);

console.log(`Total questions: ${results.totalQuestions}`);
console.log(`Multi-Select questions: ${results.multiSelect} (${Math.round(results.multiSelect / results.totalQuestions * 100)}%)`);
console.log(`Multiple Select questions: ${results.multipleSelect} (${Math.round(results.multipleSelect / results.totalQuestions * 100)}%)`);
console.log(`Combined Multi/Multiple Select: ${results.multiSelect + results.multipleSelect} (${msPercent}%)`);
console.log(`Multiple Choice questions: ${results.multipleChoice} (${mcPercent}%)`);
console.log(`True/False questions: ${results.trueFalse} (${tfPercent}%)`);
console.log(`Other types: ${results.otherTypes.length}`);

// Print unusual types if any
if (results.otherTypes.length > 0) {
  console.log("\nUnusual question types:");
  results.otherTypes.forEach(item => {
    console.log(`- ${item.file}: ${item.type}`);
  });
}