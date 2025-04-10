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
  const sections = markdown.split('---').map(section => section.trim()).filter(section => section.length > 0);
  
  // Start building the HTML
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${quizTitle}</title>
  <link rel="stylesheet" href="../css/styles.css">
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
          <li><a href="17.4-Combined.html">17.4 Deep Q-Learning</a></li>
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
    const titleMatch = section.match(/### (.+)$/m);
    if (!titleMatch) return;
    
    const title = titleMatch[1];
    const questionType = title.match(/\((.+)\)/)?.[1]?.toLowerCase() || '';
    const questionText = section.split('\n\n')[1] || '';
    
    // Determine input type (checkbox or radio)
    const isMultiSelect = questionType.includes('multi-select') || questionType.includes('multiple select');
    const inputType = isMultiSelect ? 'checkbox' : 'radio';
    
    html += `
        <div class="question" data-question-index="${index}">
          <h3>${title}</h3>
          <p>${questionText}</p>
          <div class="options">
    `;
    
    // Extract options
    const optionMatches = [...section.matchAll(/- \[ \] (.+)/g)];
    optionMatches.forEach((match, optIndex) => {
      const optionText = match[1].trim();
      html += `
            <div class="option">
              <input type="${inputType}" id="q${index}-o${optIndex}" name="q${index}" value="${optIndex}">
              <label for="q${index}-o${optIndex}">${optionText}</label>
            </div>
      `;
    });
    
    // Extract explanation from the details/summary section
    const detailsMatch = section.match(/<details>[\s\S]+?<summary>Show Answer<\/summary>([\s\S]+?)<\/details>/);
    const explanation = detailsMatch ? detailsMatch[1].trim() : '';
    
    html += `
          </div>
          <div class="feedback"></div>
          <button class="btn btn-check">Check Answer</button>
          <button class="btn show-answer-btn">Show Explanation</button>
          <div class="explanation">${explanation}</div>
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