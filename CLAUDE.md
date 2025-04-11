# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- `cd docs && node build.js` - Build HTML quiz files from markdown
- `cd docs && node standardize_markdown.js` - Standardize markdown quiz files
- `cd docs && node test_markdown_format.js` - Test markdown format consistency
- `cd docs && node test_quiz_questions.js` - Test quiz questions and answers

## Code Style Guidelines
- Standardize quiz format: Questions use `### Question X (Type)` headings
- Quiz options format: `- [ ] A. Option text` with letter prefixes
- Answers format: `**Correct Answers:** A, B, C` within `<details>` tags
- Explanations should include quotes from transcripts
- Use JavaScript ES6+ features
- HTML pages follow consistent navigation sidebar structure
- Use relative paths for internal links
- Maintain multimodal support with MathJax for equations