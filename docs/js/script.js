document.addEventListener('DOMContentLoaded', function() {
  // Set up quiz interactivity
  setupQuizInteractivity();
});

function setupQuizInteractivity() {
  // Add event listeners for check buttons
  document.querySelectorAll('.btn-check').forEach(button => {
    button.addEventListener('click', function() {
      const questionEl = this.closest('.question');
      const explanationEl = questionEl.querySelector('.explanation');
      
      // Check the answer
      const result = checkAnswer(questionEl);
      
      // If incorrect or explanation not yet shown, show the explanation
      if (!result.isCorrect || explanationEl.style.display !== 'block') {
        explanationEl.style.display = 'block';
        this.textContent = 'Hide Explanation';
      } else if (explanationEl.style.display === 'block') {
        // Toggle the explanation visibility if already shown
        explanationEl.style.display = 'none';
        this.textContent = 'Check Answer';
      }
    });
  });
  
  // Hide explanations initially
  document.querySelectorAll('.explanation').forEach(explanation => {
    explanation.style.display = 'none';
  });
}

function checkAnswer(questionEl) {
  const feedbackEl = questionEl.querySelector('.feedback');
  const options = questionEl.querySelectorAll('input');
  const inputType = questionEl.querySelector('input').type;
  
  let isCorrect = true;
  let hasSelection = false;
  
  options.forEach(option => {
    const shouldBeSelected = option.dataset.correct === 'true';
    if (option.checked !== shouldBeSelected) {
      isCorrect = false;
    }
    if (option.checked) {
      hasSelection = true;
    }
  });
  
  // Check if user selected at least one option
  if (!hasSelection) {
    feedbackEl.textContent = 'Please select an answer before checking.';
    feedbackEl.className = 'feedback warning';
    return { isCorrect: false, hasSelection: false };
  }
  
  // Set appropriate feedback message
  if (isCorrect) {
    feedbackEl.textContent = 'Correct! Well done.';
    feedbackEl.className = 'feedback correct';
  } else {
    if (inputType === 'checkbox') {
      feedbackEl.textContent = 'Not quite right. Remember to select all correct options (and only those).';
    } else {
      feedbackEl.textContent = 'Not correct. Try again.';
    }
    feedbackEl.className = 'feedback incorrect';
  }
  
  // Highlight correct answers
  options.forEach(option => {
    const label = option.nextElementSibling;
    if (option.dataset.correct === 'true') {
      label.classList.add('correct-answer');
    }
  });
  
  return { isCorrect, hasSelection: true };
}