const fs = require('fs');
const path = require('path');

// Get all files in the directory
const files = fs.readdirSync('.');

// Find question and answer pairs
const questionFiles = files.filter(file => 
  file.includes('Questions.md') || 
  file.includes('questions.md') ||
  file.match(/\d+\.\d+[aA] -/));

// Add special case for 17.4a which has "Questions" without .md
if (files.includes('17.4a - Questions')) {
  questionFiles.push('17.4a - Questions');
}

// Process each question file
questionFiles.forEach(questionFile => {
  // Find the corresponding answer file
  const baseName = questionFile.replace('Questions.md', '').replace('questions.md', '')
    .replace('Questions', '').replace('questions', '')
    .replace('A - ', '').replace('a - ', '');
  
  const answerFile = files.find(file => 
    (file.includes(baseName + 'B - Answers.md') || 
     file.includes(baseName + 'b - Answers.md') ||
     file.includes(baseName + 'B - answers.md') ||
     file.includes(baseName + 'b - answers.md')));
  
  if (!answerFile) {
    console.log(`Could not find answer file for ${questionFile}`);
    return;
  }
  
  console.log(`Processing ${questionFile} and ${answerFile}`);
  
  // Read the files
  const questionContent = fs.readFileSync(questionFile, 'utf8');
  const answerContent = fs.readFileSync(answerFile, 'utf8');
  
  // Split files by question/answer
  const questionSections = questionContent.split('---').map(q => q.trim());
  const answerSections = answerContent.split('---').map(a => a.trim());
  
  // Extract the title from the first question section and then remove it from that section
  let title = '';
  const titleMatch = questionSections[0].match(/^# .+$/m);
  if (titleMatch) {
    title = titleMatch[0];
    questionSections[0] = questionSections[0].replace(/^# .+$/m, '').trim();
  }
  
  // Combine each question with its answer
  let combinedContent = '';
  
  // Add the title only once
  if (title) {
    combinedContent += title + '\n\n';
  }
  
  // Process each question-answer pair
  for (let i = 0; i < questionSections.length; i++) {
    let question = questionSections[i];
    let answer = '';
    
    // Skip empty sections
    if (!question) continue;
    
    // Extract question number
    const questionNumMatch = question.match(/Question (\d+)/i);
    if (questionNumMatch) {
      const questionNum = questionNumMatch[1];
      // Find the answer section with the same number
      const matchingAnswer = answerSections.find(a => a.includes(`Question ${questionNum}`));
      if (matchingAnswer) {
        // Extract just the answer part (remove the question title)
        const answerContent = matchingAnswer.replace(/^### Question \d+.+$/m, '').trim();
        
        // Remove the title of the answer file if present
        answer = answerContent.replace(/^# Answer Key:.+$/m, '').trim();
        
        // Remove any content reference tags
        answer = answer.replace(/&#8203;:contentReference\[oaicite:\d+\]\{index=\d+\}/g, '');
      }
    }
    
    if (!answer && i < answerSections.length) {
      // Fallback: use the answer at the same position
      answer = answerSections[i].replace(/^### Question \d+.+$/m, '').trim();
      answer = answer.replace(/^# Answer Key:.+$/m, '').trim();
      answer = answer.replace(/&#8203;:contentReference\[oaicite:\d+\]\{index=\d+\}/g, '');
    }
    
    if (answer) {
      // Add question content
      combinedContent += question + '\n\n';
      
      // Add answer in details/summary tag
      combinedContent += '<details>\n<summary>Show Answer</summary>\n\n';
      combinedContent += answer + '\n</details>\n\n';
      
      // Add separator except for the last item
      if (i < questionSections.length - 1) {
        combinedContent += '---\n\n';
      }
    } else {
      // Just add the question if no answer found
      combinedContent += question + '\n\n';
      combinedContent += '<details>\n<summary>Show Answer</summary>\n\nAnswer not found\n</details>\n\n';
      
      // Add separator except for the last item
      if (i < questionSections.length - 1) {
        combinedContent += '---\n\n';
      }
    }
  }
  
  // Create the output file
  const outputFileName = baseName + 'Combined.md';
  fs.writeFileSync(outputFileName, combinedContent);
  console.log(`Created ${outputFileName}`);
});

console.log('All files processed.');