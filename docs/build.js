const fs = require('fs');
const path = require('path');

// Simple markdown parsing
function parseMarkdown(markdown) {
  return markdown
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

// Helper function to read file contents
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`Error reading file ${filePath}:`, err);
    return null;
  }
}

// Base HTML template
function getHtmlTemplate(title, content, isMainPage = false) {
  const cssPath = isMainPage ? 'css/styles.css' : '../css/styles.css';
  const jsPath = isMainPage ? 'js/script.js' : '../js/script.js';
  
  // Adjust navigation paths based on if it's the main page
  const quizPrefix = isMainPage ? 'quizzes/' : '';
  const transcriptPrefix = isMainPage ? 'transcripts/' : '../transcripts/';
  const mainPath = isMainPage ? '' : '../';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - CS7643 Module 4</title>
  <link rel="stylesheet" href="${cssPath}">
</head>
<body>
  <div class="container">
    <div class="sidebar">
      <h2><a href="${mainPath}index.html" style="color: white; text-decoration: none;">CS7643 Module 4</a></h2>
      <div class="topic-group">
        <h3>Generative Models</h3>
        <ul>
          <li><a href="${quizPrefix}13.1Combined.html">13.1 Introduction</a></li>
          <li><a href="${quizPrefix}13.2Combined.html">13.2 PixelRNN & PixelCNN</a></li>
          <li><a href="${quizPrefix}13.3Combined.html">13.3 GANs</a></li>
          <li><a href="${quizPrefix}13.4Combined.html">13.4 VAEs</a></li>
        </ul>
      </div>
      <div class="topic-group">
        <h3>Reinforcement Learning</h3>
        <ul>
          <li><a href="${quizPrefix}17.1Combined.html">17.1 Introduction</a></li>
          <li><a href="${quizPrefix}17.2Combined.html">17.2 MDPs</a></li>
          <li><a href="${quizPrefix}17.3Combined.html">17.3 Solving MDPs</a></li>
          <li><a href="${quizPrefix}17.4-Combined.html">17.4 Deep Q-Learning</a></li>
          <li><a href="${quizPrefix}17.5Combined.html">17.5 Policy Gradients</a></li>
        </ul>
      </div>
      <div class="topic-group">
        <h3>Advanced Topics</h3>
        <ul>
          <li><a href="${quizPrefix}18.1Combined.html">18.1 Introduction</a></li>
          <li><a href="${quizPrefix}18.2Combined.html">18.2 Semi-Supervised</a></li>
          <li><a href="${quizPrefix}18.3Combined.html">18.3 Few-Shot</a></li>
          <li><a href="${quizPrefix}18.4Combined.html">18.4 Self-Supervised</a></li>
        </ul>
      </div>
      <div class="topic-group">
        <h3>Transcripts</h3>
        <ul>
          <li><a href="${transcriptPrefix}index.html">View All Transcripts</a></li>
        </ul>
      </div>
    </div>
    
    <div class="content">
      ${content}
    </div>
  </div>
  <script src="${jsPath}"></script>
</body>
</html>`;
}

// Generate a quiz from the markdown file
function generateQuizHtml(markdownPath) {
  const markdown = readFile(markdownPath);
  if (!markdown) return null;
  
  // Extract title
  const titleMatch = markdown.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1] : path.basename(markdownPath, '.md');
  
  // Split into questions
  const sections = markdown.split('---').map(section => section.trim()).filter(section => section.length > 0);
  
  let quizHtml = `<h2 class="section-title">${title}</h2>
  <div class="quiz-container">`;
  
  // Process each question
  sections.forEach((section, index) => {
    // Get question title and type
    const questionMatch = section.match(/### (.+?)(?:\r?\n|$)/);
    if (!questionMatch) return;
    
    const questionTitle = questionMatch[1];
    const isMultiSelect = questionTitle.toLowerCase().includes('multi-select') || 
                         questionTitle.toLowerCase().includes('multiple select');
    const inputType = isMultiSelect ? 'checkbox' : 'radio';
    
    // Get question text - everything between title and first option
    let questionText = '';
    const lines = section.split('\n');
    let startLine = 0;
    let endLine = 0;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(questionMatch[0])) {
        startLine = i + 1;
      } else if (startLine > 0 && lines[i].trim().startsWith('- [')) {
        endLine = i;
        break;
      }
    }
    
    if (startLine > 0 && endLine > startLine) {
      questionText = lines.slice(startLine, endLine).join('\n').trim();
    }
    
    // Start building question HTML
    quizHtml += `
    <div class="question" data-question-index="${index}">
      <h3>${questionTitle}</h3>
      <p>${questionText}</p>
      <div class="options">`;
    
    // Extract options
    const options = [];
    
    // First try to match checkbox style options: - [x] or - [ ]
    const checkboxRegex = /- \[([ xX])\] (.+)/g;
    let match;
    let foundCheckboxes = false;
    
    // Use a string copy for regex iteration
    const sectionCopy = section.toString();
    while ((match = checkboxRegex.exec(sectionCopy)) !== null) {
      foundCheckboxes = true;
      options.push({
        isCorrect: match[1].toLowerCase() === 'x',
        text: match[2].trim()
      });
    }
    
    // If no checkbox options were found, try plain bullet points
    if (!foundCheckboxes) {
      // Identify correct answers from the explanation section
      const explanationMatch = section.match(/<details>[\s\S]+?<summary>Show Answer<\/summary>([\s\S]+?)<\/details>/);
      let correctAnswers = [];
      
      if (explanationMatch) {
        const explanation = explanationMatch[1];
        
        // Look for patterns that indicate correct answers
        if (explanation.includes("Correct Answer:")) {
          // For true/false or single select
          const correctAnswerMatch = explanation.match(/Correct Answer:[ ]*([^,\n]+)/);
          if (correctAnswerMatch) {
            correctAnswers.push(correctAnswerMatch[1].trim());
          } else {
            // If no specific match, try common answers
            if (explanation.includes("True")) correctAnswers.push("True");
            if (explanation.includes("False")) correctAnswers.push("False");
          }
        }
        
        // For multi-select, look for various patterns
        if (explanation.includes("Correct Answers:")) {
          // Try to match checkmarks
          const checkMarks = explanation.match(/✅([^,]+)/g);
          if (checkMarks && checkMarks.length > 0) {
            correctAnswers = checkMarks.map(mark => mark.replace('✅', '').trim());
          } else {
            // Try to match list of answers
            const answersList = explanation.match(/Correct Answers:[ ]*(.*?)(?:\n|$)/);
            if (answersList && answersList[1]) {
              correctAnswers = answersList[1].split(',').map(a => a.trim());
            }
          }
        }
        
        // If we still don't have answers, look for bolded text
        if (correctAnswers.length === 0) {
          const boldedTexts = explanation.match(/\*\*([^*]+)\*\*/g);
          if (boldedTexts && boldedTexts.length > 0) {
            correctAnswers = boldedTexts.map(text => text.replace(/\*\*/g, '').trim());
          }
        }
      }
      
      // Extract regular bullet point options
      // Get only the options part of the section (after question, before details)
      const optionsStart = section.indexOf('\n- ');
      const optionsEnd = section.indexOf('<details>');
      
      if (optionsStart > 0 && optionsEnd > optionsStart) {
        const optionsSection = section.substring(optionsStart, optionsEnd).trim();
        const optionsLines = optionsSection.split('\n');
        
        // Only process lines that start with a bullet point
        optionsLines.forEach(line => {
          if (line.trim().startsWith('- ')) {
            const optionText = line.trim().substring(2).trim();
            if (optionText) {
              // Determine if this option is correct
              let isCorrect = correctAnswers.some(answer => {
                // First try exact match
                if (optionText === answer) return true;
                
                // Then try partial match with normalization
                const normalizedOption = optionText.toLowerCase().replace(/[^a-z0-9]/g, '');
                const normalizedAnswer = answer.toLowerCase().replace(/[^a-z0-9]/g, '');
                return normalizedOption.includes(normalizedAnswer) || 
                      normalizedAnswer.includes(normalizedOption);
              });
              
              // Special handling for multi-select questions with checkmarks in explanation
              const explanationMatch = section.match(/<details>[\s\S]+?<summary>Show Answer<\/summary>([\s\S]+?)<\/details>/);
              if (explanationMatch && !isCorrect && isMultiSelect) {
                const explanation = explanationMatch[1];
                
                // Look for the option mentioned with a checkmark in the explanation
                isCorrect = explanation.includes(`✅ ${optionText}`) || 
                           explanation.includes(`✅${optionText}`);
              }
              
              options.push({
                isCorrect,
                text: optionText
              });
            }
          }
        });
      }
    }
    
    // Add options to HTML
    options.forEach((option, optIndex) => {
      quizHtml += `
        <div class="option">
          <input type="${inputType}" id="q${index}-o${optIndex}" name="q${index}" value="${optIndex}" data-correct="${option.isCorrect}">
          <label for="q${index}-o${optIndex}">${option.text}</label>
        </div>`;
    });
    
    // Add explanation
    let explanation = '';
    const explanationMatch = section.match(/<details>[\s\S]+?<summary>Show Answer<\/summary>([\s\S]+?)<\/details>/);
    
    if (explanationMatch) {
      explanation = explanationMatch[1].trim()
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/> "(.+?)"/g, '<blockquote>"$1"</blockquote>');
    }
    
    quizHtml += `
      </div>
      <div class="feedback"></div>
      <button class="btn btn-check">Check Answer</button>
      <button class="btn show-answer-btn">Show Explanation</button>
      <div class="explanation">${explanation}</div>
    </div>`;
  });
  
  quizHtml += `</div>`;
  return { title, content: quizHtml };
}

// Format transcript content
function formatTranscript(text) {
  return text
    .replace(/\[(\d{2}:\d{2}:\d{2})\]/g, '<span class="timestamp">[$1]</span>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

// Create quiz index content
function createQuizIndexContent(quizFiles) {
  let content = `<h2 class="section-title">All Quizzes</h2>
  <div class="quiz-list">`;
  
  quizFiles.forEach(file => {
    const quizId = path.basename(file, '.md');
    let topic = '';
    
    // Extract topic from filename
    if (quizId.startsWith('13')) {
      topic = 'Generative Models';
    } else if (quizId.startsWith('17')) {
      topic = 'Reinforcement Learning';
    } else if (quizId.startsWith('18')) {
      topic = 'Advanced Topics';
    }
    
    // Format title
    const number = quizId.match(/(\d+\.\d+)/)?.[1] || '';
    const title = number ? `${number} - ${topic}` : quizId;
    
    content += `
    <div class="quiz-item">
      <h3><a href="${quizId}.html">${title}</a></h3>
    </div>`;
  });
  
  content += `</div>`;
  return content;
}

// Create transcript index content
function createTranscriptIndexContent(transcriptFiles) {
  let content = `<h2 class="section-title">All Transcripts</h2>
  <div class="transcript-list">`;
  
  transcriptFiles.forEach(file => {
    const basename = path.basename(file);
    const title = basename.replace('.txt', '');
    const htmlFilename = basename.replace('.txt', '.html');
    
    content += `
    <div class="transcript-item">
      <h3><a href="${htmlFilename}">${title}</a></h3>
    </div>`;
  });
  
  content += `</div>`;
  return content;
}

// Main function to build the site
function buildSite() {
  console.log('Starting site build...');
  
  const quizDir = path.join(__dirname, 'quizzes');
  const transcriptDir = path.join(__dirname, 'transcripts');
  
  // Get all content files
  const quizFiles = fs.readdirSync(quizDir)
    .filter(file => file.endsWith('.md'))
    .map(file => path.join(quizDir, file));
  
  const transcriptFiles = fs.readdirSync(transcriptDir)
    .filter(file => file.endsWith('.txt'))
    .map(file => path.join(transcriptDir, file));
  
  // Process quizzes
  console.log('Generating quiz pages...');
  quizFiles.forEach(quizFile => {
    const quizId = path.basename(quizFile, '.md');
    const quiz = generateQuizHtml(quizFile);
    
    if (quiz) {
      const html = getHtmlTemplate(quiz.title, quiz.content);
      fs.writeFileSync(path.join(quizDir, `${quizId}.html`), html);
      console.log(`Generated: ${quizId}.html`);
    }
  });
  
  // Process transcripts
  console.log('Generating transcript pages...');
  transcriptFiles.forEach(transcriptFile => {
    const basename = path.basename(transcriptFile);
    const title = basename.replace('.txt', '');
    const htmlFilename = basename.replace('.txt', '.html');
    
    const content = readFile(transcriptFile);
    if (content) {
      const transcriptContent = `
        <h2 class="section-title">${title}</h2>
        <div class="transcript-container">
          <div class="transcript">
            ${formatTranscript(content)}
          </div>
        </div>
      `;
      
      const html = getHtmlTemplate(title, transcriptContent);
      fs.writeFileSync(path.join(transcriptDir, htmlFilename), html);
      console.log(`Generated: ${htmlFilename}`);
    }
  });
  
  // Create index pages
  console.log('Generating index pages...');
  
  // Quiz index
  const quizIndexContent = createQuizIndexContent(quizFiles);
  const quizIndexHtml = getHtmlTemplate('Quiz Index', quizIndexContent);
  fs.writeFileSync(path.join(quizDir, 'index.html'), quizIndexHtml);
  console.log('Generated quiz index page');
  
  // Transcript index
  const transcriptIndexContent = createTranscriptIndexContent(transcriptFiles);
  const transcriptIndexHtml = getHtmlTemplate('Transcript Index', transcriptIndexContent);
  fs.writeFileSync(path.join(transcriptDir, 'index.html'), transcriptIndexHtml);
  console.log('Generated transcript index page');
  
  // Main index
  const mainContent = `
    <h2 class="section-title">CS7643 Module 4 - Deep Learning</h2>
    <div class="main-content">
      <p>Welcome to the Module 4 interactive learning environment. This site contains interactive quizzes and lecture transcripts to help you learn and review the material.</p>
      
      <div class="main-links">
        <div class="link-card">
          <h3>Quizzes</h3>
          <p>Test your knowledge with interactive quizzes covering all module topics.</p>
          <a href="quizzes/index.html" class="btn">View Quizzes</a>
        </div>
        
        <div class="link-card">
          <h3>Transcripts</h3>
          <p>Read through lecture transcripts to review the material.</p>
          <a href="transcripts/index.html" class="btn">View Transcripts</a>
        </div>
      </div>
    </div>
  `;
  
  const mainIndexHtml = getHtmlTemplate('CS7643 Module 4', mainContent, true);
  fs.writeFileSync(path.join(__dirname, 'index.html'), mainIndexHtml);
  console.log('Generated main index page');
  
  console.log('Site build complete!');
}

// Execute the build
buildSite();