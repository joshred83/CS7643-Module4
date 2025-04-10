# CS7643 Module 4 Interactive Site

This is an interactive learning environment for CS7643 Module 4, featuring quizzes and lecture transcripts.

## Features

- Interactive quizzes with automatic grading
- Complete lecture transcripts
- Easy navigation between topics
- Mobile-responsive design

## Standardized Quiz Format

All quiz markdown files have been standardized to use the following format:

```markdown
### Question X (Multi-Select)
Question text here

- [ ] A. Option 1
- [ ] B. Option 2
- [ ] C. Option 3

<details>
<summary>Show Answer</summary>

**Correct Answers:** A, C
**Explanation:**  
Explanation text here...

> "Quote from the lecture transcript"
</details>
```

This standardized format ensures:
- Consistent presentation across all quizzes
- Letter-prefixed options (A, B, C, etc.) for clear reference
- Explicit correct answer marking with `**Correct Answers:** A, B, C`
- Clear separation between question text, options, and explanations

## Build Process

The build system has been optimized to work with the standardized format:

1. Markdown files are parsed using the standardized format
2. Question text, options, and correct answers are extracted
3. HTML is generated with proper data attributes for interactivity
4. CSS styling is applied for a consistent visual experience

## Development

To modify the site:

1. Edit the markdown files in `docs/quizzes/` following the standardized format
2. Run the standardization script if needed:
   ```bash
   cd docs
   node standardize_markdown.js
   ```

3. Run the build script to regenerate the HTML:
   ```bash
   cd docs
   node build.js
   ```

4. Test the site by opening the generated HTML files in a browser

## Deployment to GitHub Pages

To deploy this site to GitHub Pages:

1. Push this directory to your GitHub repository:
   ```bash
   git add docs
   git commit -m "Add interactive quizzes and transcripts site"
   git push
   ```

2. In your GitHub repository settings:
   - Go to "Pages" section
   - Under "Build and deployment":
     - Set "Source" to "Deploy from a branch"
     - Select the branch containing your docs directory (usually "main")
     - Set the folder to "/docs"
   - Click "Save"

3. GitHub will provide you with a URL to your live site (usually in the format `https://username.github.io/repository-name/`)

## Structure

- `docs/index.html` - Main entry point
- `docs/quizzes/` - Quiz HTML files and source markdown
- `docs/transcripts/` - Transcript HTML files and source text
- `docs/js/` - JavaScript for interactivity
- `docs/css/` - Styling
- `docs/build.js` - Build script that generates HTML from markdown
- `docs/standardize_markdown.js` - Script to standardize markdown files

## Credits

Created for CS7643 Module 4, using:
- HTML5
- CSS3
- Vanilla JavaScript