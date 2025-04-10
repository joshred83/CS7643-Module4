# CS7643 Module 4 Interactive Site

This is an interactive learning environment for CS7643 Module 4, featuring quizzes and lecture transcripts.

## Features

- Interactive quizzes with automatic grading
- Complete lecture transcripts
- Easy navigation between topics
- Mobile-responsive design

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

## Development

To modify the site:

1. Edit the markdown files in `docs/quizzes/` and `docs/transcripts/`
2. Run the build script to regenerate the HTML:
   ```bash
   cd docs
   node build.js
   ```

3. Test the site by opening the generated HTML files in a browser

## Structure

- `docs/index.html` - Main entry point
- `docs/quizzes/` - Quiz HTML files and source markdown
- `docs/transcripts/` - Transcript HTML files and source text
- `docs/js/` - JavaScript for interactivity
- `docs/css/` - Styling
- `docs/build.js` - Build script that generates HTML from markdown

## Credits

Created for CS7643 Module 4, using:
- HTML5
- CSS3
- Vanilla JavaScript