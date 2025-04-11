/**
 * Script to analyze question types across ALL quiz files (not just Combined ones)
 */
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all quiz files
const quizFiles = glob.sync(path.join(__dirname, 'quizzes/*.md'));

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
  fileStats: {},
  byCategory: {
    'Combined': { count: 0, multiSelectCount: 0, multipleSelectCount: 0 },
    'Questions': { count: 0, multiSelectCount: 0, multipleSelectCount: 0 },
    'Answers': { count: 0, multiSelectCount: 0, multipleSelectCount: 0 },
    'Other': { count: 0, multiSelectCount: 0, multipleSelectCount: 0 }
  }
};

// Process each file
quizFiles.forEach(file => {
  const fileName = path.basename(file);
  const content = fs.readFileSync(file, 'utf8');
  
  // Determine file category
  let category = 'Other';
  if (fileName.includes('Combined')) {
    category = 'Combined';
  } else if (fileName.includes('Questions')) {
    category = 'Questions';
  } else if (fileName.includes('Answers')) {
    category = 'Answers';
  }
  
  // Setup file stats
  results.fileStats[fileName] = {
    total: 0,
    multiSelect: 0,
    multipleChoice: 0,
    multipleSelect: 0,
    trueFalse: 0,
    otherTypes: [],
    category: category
  };
  
  // Find all question sections
  const sections = content.split(/(?=#{3}\s+Question \d+)/g).filter(s => s.trim().length > 0);
  
  sections.forEach(section => {
    // Extract question header
    const headerMatch = section.match(/#{3}\s+Question (\d+)\s*(?:\(([^)]+)\))?/);
    if (!headerMatch) return;
    
    const questionNumber = headerMatch[1];
    const questionType = headerMatch[2] ? headerMatch[2].trim() : 'Unknown';
    
    results.fileStats[fileName].total++;
    results.totalQuestions++;
    results.byCategory[category].count++;
    
    // Count by type using more precise patterns
    if (/multi-select/i.test(questionType)) {
      results.fileStats[fileName].multiSelect++;
      results.multiSelect++;
      results.byCategory[category].multiSelectCount++;
    } else if (/multiple select/i.test(questionType)) {
      results.fileStats[fileName].multipleSelect++;
      results.multipleSelect++;
      results.byCategory[category].multipleSelectCount++;
    } else if (/multiple choice/i.test(questionType)) {
      results.fileStats[fileName].multipleChoice++;
      results.multipleChoice++;
    } else if (/true[\/\s-]false/i.test(questionType)) {
      results.fileStats[fileName].trueFalse++;
      results.trueFalse++;
    } else {
      results.fileStats[fileName].otherTypes.push(`Q${questionNumber}: ${questionType}`);
      results.otherTypes.push({file: fileName, question: questionNumber, type: questionType});
    }
    
    // Count answer options to determine if multi-select based on answers
    if (category === 'Combined' || category === 'Answers') {
      // Get correct answers from the details section or answer patterns
      const detailsMatch = section.match(/<details>[\s\S]+?<summary>Show Answer<\/summary>([\s\S]+?)<\/details>/);
      
      if (detailsMatch) {
        // Combined files with details section
        const explanation = detailsMatch[1];
        const correctAnswersMatch = explanation.match(/\*\*Correct Answers?:\*\*\s+([A-Z,\s]+)/i);
        
        if (correctAnswersMatch) {
          const correctLetters = correctAnswersMatch[1]
            .split(/[,\s]+/)
            .filter(letter => /^[A-Z]$/.test(letter));
            
          if (correctLetters.length > 1 && !/multi/i.test(questionType)) {
            // Question has multiple correct answers but isn't labeled as multi-select
            results.fileStats[fileName].otherTypes.push(`Q${questionNumber}: ${questionType} (but has ${correctLetters.length} correct answers)`);
          }
        }
      } else {
        // Answer files without details section
        const correctAnswersMatch = section.match(/\*\*Correct Answers?:\*\*\s+([A-Z,\s]+)/i);
        
        if (correctAnswersMatch) {
          const correctLetters = correctAnswersMatch[1]
            .split(/[,\s]+/)
            .filter(letter => /^[A-Z]$/.test(letter));
            
          if (correctLetters.length > 1 && !/multi/i.test(questionType)) {
            // Question has multiple correct answers but isn't labeled as multi-select
            results.fileStats[fileName].otherTypes.push(`Q${questionNumber}: ${questionType} (but has ${correctLetters.length} correct answers)`);
          }
        }
      }
    }
  });
});

// Print detailed results
console.log("========== ALL QUIZ FILES ANALYSIS ==========\n");

// Print file category summary
console.log("Files by Category:");
console.log("----------------------------------------");
Object.entries(results.byCategory).forEach(([category, stats]) => {
  const msPercent = stats.count > 0 ? 
    Math.round((stats.multiSelectCount + stats.multipleSelectCount) / stats.count * 100) : 0;
  
  console.log(`${category}: ${stats.count} files, ${stats.multiSelectCount + stats.multipleSelectCount} Multi-Select questions (${msPercent}%)`);
});

// Print file-by-file stats
console.log("\nFile-by-file analysis:");
console.log("----------------------------------------");
console.log("File | Category | Total | Multi-Select | Multiple Select | Multiple Choice | True/False | Other");
console.log("----------------------------------------");

Object.entries(results.fileStats)
  .filter(([_, stats]) => stats.total > 0)
  .sort(([fileA, statsA], [fileB, statsB]) => {
    // Sort by category then by filename
    if (statsA.category !== statsB.category) {
      return statsA.category.localeCompare(statsB.category);
    }
    return fileA.localeCompare(fileB);
  })
  .forEach(([fileName, stats]) => {
    const msPercent = stats.total > 0 ? 
      Math.round((stats.multiSelect + stats.multipleSelect) / stats.total * 100) : 0;
    const mcPercent = stats.total > 0 ? Math.round(stats.multipleChoice / stats.total * 100) : 0;
    const tfPercent = stats.total > 0 ? Math.round(stats.trueFalse / stats.total * 100) : 0;
    const otherCount = stats.otherTypes.length;
    
    console.log(`${fileName} | ${stats.category} | ${stats.total} | ${stats.multiSelect} | ${stats.multipleSelect} | ${stats.multipleChoice} (${mcPercent}%) | ${stats.trueFalse} (${tfPercent}%) | ${otherCount}`);
  });

// Print overall summary
console.log("\n========== OVERALL SUMMARY ==========");
console.log(`Total questions across all files: ${results.totalQuestions}`);

// Summary by file type
console.log("\nCombined Files (Final Quiz Files):");
const msPercent = results.byCategory['Combined'].count > 0 ? 
  Math.round((results.byCategory['Combined'].multiSelectCount + results.byCategory['Combined'].multipleSelectCount) / 
    results.byCategory['Combined'].count * 100) : 0;
console.log(`Total questions: ${results.byCategory['Combined'].count}`);
console.log(`Multi-Select/Multiple Select questions: ${results.byCategory['Combined'].multiSelectCount + results.byCategory['Combined'].multipleSelectCount} (${msPercent}%)`);

// Print unusual types if any
if (results.otherTypes.length > 0) {
  console.log("\nUnusual question types:");
  results.otherTypes.forEach(item => {
    console.log(`- ${item.file}: Q${item.question} - ${item.type}`);
  });
}