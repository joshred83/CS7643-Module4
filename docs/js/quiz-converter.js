// This script is for converting the combined markdown files into the interactive format

document.addEventListener('DOMContentLoaded', function() {
  const converterForm = document.getElementById('converter-form');
  
  if (converterForm) {
    converterForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const fileInput = document.getElementById('markdown-file');
      
      if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
          const markdown = e.target.result;
          const converted = convertMarkdownToInteractive(markdown);
          document.getElementById('output').value = converted;
        };
        
        reader.readAsText(file);
      }
    });
  }
});

function convertMarkdownToInteractive(markdown) {
  // Parse the markdown content
  const quizTitle = markdown.match(/^# (.+)$/m)?.[1] || 'Quiz';
  const sections = markdown.split(/(?=#{3}\s+Question \d+)/g).filter(section => section.trim().length > 0);
  
  // Start building the HTML
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${quizTitle}</title>
  <link rel="stylesheet" href="../css/styles.css">
  <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
  <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
</head>
<body>
  <div class="container">
    <div class="sidebar">
      <h2>CS7643 Module 4</h2>
      <div class="topic-group">
        <h3>Generative Models</h3>
        <ul>
          <li><a href="13.1Combined.html">13.1 Introduction</a></li>
          <li><a href="13.2Combined.html">13.2 PixelRNN & PixelCNN</a></li>
          <li><a href="13.3Combined.html">13.3 GANs</a></li>
          <li><a href="13.4Combined.html">13.4 VAEs</a></li>
        </ul>
      </div>
      <div class="topic-group">
        <h3>Reinforcement Learning</h3>
        <ul>
          <li><a href="17.1Combined.html">17.1 Introduction</a></li>
          <li><a href="17.2Combined.html">17.2 MDPs</a></li>
          <li><a href="17.3Combined.html">17.3 Solving MDPs</a></li>
          <li><a href="17.4Combined.html">17.4 Deep Q-Learning</a></li>
          <li><a href="17.5Combined.html">17.5 Policy Gradients</a></li>
        </ul>
      </div>
      <div class="topic-group">
        <h3>Advanced Topics</h3>
        <ul>
          <li><a href="18.1Combined.html">18.1 Introduction</a></li>
          <li><a href="18.2Combined.html">18.2 Semi-Supervised</a></li>
          <li><a href="18.3Combined.html">18.3 Few-Shot</a></li>
          <li><a href="18.4Combined.html">18.4 Self-Supervised</a></li>
        </ul>
      </div>
      <div class="topic-group">
        <h3>Transcripts</h3>
        <ul>
          <li><a href="../transcripts/index.html">View All Transcripts</a></li>
        </ul>
      </div>
    </div>
    
    <div class="content">
      <h2 class="section-title">${quizTitle}</h2>
      <div class="quiz-container">
  `;
  
  // Process each question section
  sections.forEach((section, index) => {
    // Extract question title
    const titleMatch = section.match(/#{3}\s+(.+)$/m);
    if (!titleMatch) return;
    
    const title = titleMatch[1];
    const questionType = title.match(/\((.+)\)/)?.[1]?.toLowerCase() || '';
    
    // Extract question text
    const headerEndIndex = section.indexOf('\n\n', section.indexOf(title));
    const optionsStartIndex = section.indexOf('- [ ]');
    
    let questionText = '';
    if (headerEndIndex !== -1 && optionsStartIndex !== -1) {
      questionText = section.substring(headerEndIndex, optionsStartIndex).trim();
    }
    
    // Determine input type (checkbox or radio)
    const isMultiSelect = questionType.includes('multi-select') || questionType.includes('multiple select');
    const inputType = isMultiSelect ? 'checkbox' : 'radio';
    
    html += `
        <div class="question" data-question-index="${index}">
          <h3>${title}</h3>
          <p>${questionText}</p>
          <div class="options">
    `;
    
    // Extract explanation from the details/summary section
    const detailsMatch = section.match(/<details>[\s\S]+?<summary>Show Answer<\/summary>([\s\S]+?)<\/details>/);
    const explanation = detailsMatch ? detailsMatch[1].trim() : '';
    
    // Extract correct answers from standardized format
    const correctAnswersMatch = explanation.match(/\*\*Correct Answers?:\*\*\s*([A-Z,\s]+)/i);
    const correctLetters = correctAnswersMatch 
      ? correctAnswersMatch[1].split(',').map(letter => letter.trim()) 
      : [];
    
    // Extract options with letter prefixes
    const optionMatches = [...section.matchAll(/- \[ \] ([A-Z])\.\s+(.+)/g)];
    
    optionMatches.forEach((match, optIndex) => {
      const letterPrefix = match[1].trim();
      const optionText = match[2].trim();
      
      // Check if this option is marked as correct by letter
      const isCorrect = correctLetters.includes(letterPrefix);
      
      html += `
            <div class="option">
              <input type="${inputType}" id="q${index}-o${optIndex}" name="q${index}" value="${optIndex}" data-correct="${isCorrect}">
              <label for="q${index}-o${optIndex}">${letterPrefix}. ${optionText}</label>
            </div>
      `;
    });
    
    // Remove the "Correct Answers" line from the explanation for display
    let cleanExplanation = explanation;
    if (correctAnswersMatch) {
      cleanExplanation = explanation.replace(/\*\*Correct Answers?:\*\*\s*[A-Z,\s]+(\n|$)/, '').trim();
    }
    
    html += `
          </div>
          <div class="feedback"></div>
          <button class="btn btn-check">Check Answer</button>
          <div class="explanation">${cleanExplanation}</div>
        </div>
    `;
  });
  
  // Close HTML
  html += `
      </div>
    </div>
  </div>
  <script src="../js/script.js"></script>
</body>
</html>
  `;
  
  return html;
}