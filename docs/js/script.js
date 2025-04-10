document.addEventListener('DOMContentLoaded', function() {
  // Set up quiz interactivity
  setupQuizInteractivity();
});

function setupQuizInteractivity() {
  // Add event listeners for check buttons
  document.querySelectorAll('.btn-check').forEach(button => {
    button.addEventListener('click', function() {
      const questionEl = this.closest('.question');
      const questionIndex = questionEl.dataset.questionIndex;
      checkAnswer(questionEl);
    });
  });
  
  // Add event listeners for show explanation buttons
  document.querySelectorAll('.show-answer-btn').forEach(button => {
    button.addEventListener('click', function() {
      const explanationEl = this.nextElementSibling;
      if (explanationEl.style.display === 'block') {
        explanationEl.style.display = 'none';
        this.textContent = 'Show Explanation';
      } else {
        explanationEl.style.display = 'block';
        this.textContent = 'Hide Explanation';
      }
    });
  });
}

function checkAnswer(questionEl) {
  const feedbackEl = questionEl.querySelector('.feedback');
  const options = questionEl.querySelectorAll('input');
  
  let isCorrect = true;
  options.forEach(option => {
    const shouldBeSelected = option.dataset.correct === 'true';
    if (option.checked !== shouldBeSelected) {
      isCorrect = false;
    }
  });
  
  if (isCorrect) {
    feedbackEl.textContent = 'Correct! Well done.';
    feedbackEl.className = 'feedback correct';
  } else {
    feedbackEl.textContent = 'Not quite right. Try again or check the explanation.';
    feedbackEl.className = 'feedback incorrect';
  }
  
  // Highlight correct answers
  options.forEach(option => {
    const label = option.nextElementSibling;
    if (option.dataset.correct === 'true') {
      label.classList.add('correct-answer');
    }
  });
}