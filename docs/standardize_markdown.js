/**
 * Improved script to standardize markdown files for the quiz system
 * 
 * This script:
 * 1. Finds all Combined.md files in the quizzes directory
 * 2. Standardizes their format using letter prefixes for options (A, B, C, etc.)
 * 3. Makes sure answers are in the format "**Correct Answers:** A, B, C"
 * 4. Adds question types (True/False, Multiple Choice, Multi-Select) if missing
 * 5. Ensures consistent formatting throughout
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Get all Combined.md files
const files = glob.sync(path.join(__dirname, 'quizzes/*Combined.md'));
console.log(`Found ${files.length} Combined.md files to standardize`);

files.forEach(file => {
    console.log(`Processing: ${file}`);
    
    let content = fs.readFileSync(file, 'utf8');
    
    // Ensure the file starts with a quiz title
    if (!content.match(/^# Quiz:/m)) {
        const fileName = path.basename(file);
        const quizName = fileName.replace(/Combined\.md$/, '').replace(/^\d+\.\d+/, '');
        content = `# Quiz: ${quizName}\n\n${content}`;
    }
    
    // Split content into sections (questions)
    const sections = content.split(/(?=#{3}\s+Question \d+)/g);
    
    // Process each section
    const processedSections = sections.map((section, index) => {
        // Skip non-question sections (like intro text)
        if (!section.match(/^#{3}\s+Question \d+/)) {
            return section;
        }
        
        // Extract question header and number 
        const headerMatch = section.match(/^(#{3}\s+Question \d+\s*(?:\([^)]+\))?\s*)/);
        if (!headerMatch) return section; // Skip if no match
        
        let header = headerMatch[1];
        
        // Check if question has a type
        let questionType = '';
        const typeMatch = header.match(/\(([^)]+)\)/);
        if (typeMatch) {
            questionType = typeMatch[1].trim();
        } else {
            // Try to infer question type
            if (section.toLowerCase().includes('true') && section.toLowerCase().includes('false') &&
                section.match(/- \[[x\s]\] .*true/i) && section.match(/- \[[x\s]\] .*false/i)) {
                questionType = 'True/False';
            } else if (section.includes('✅') || section.includes('correct') || 
                      section.match(/\*\*Correct Answers?:\*\*/i)) {
                // Count checkboxes
                const checkboxCount = (section.match(/- \[[x\s]\]/g) || []).length;
                // Count correct answers
                const correctCount = (section.match(/✅/g) || []).length;
                
                if (correctCount > 1 || checkboxCount > 4) {
                    questionType = 'Multi-Select';
                } else {
                    questionType = 'Multiple Choice';
                }
            } else {
                // Default to Multi-Select as most common type
                questionType = 'Multi-Select';
            }
            
            // Add question type to header
            const newHeader = header.trim() + ` (${questionType})\n`;
            section = section.replace(header, newHeader);
            header = newHeader;
        }
        
        // Get content after header but before options
        let questionText = '';
        const contentAfterHeader = section.substring(header.length);
        
        // Find the index of the first checkbox or option
        const checkboxIndex = contentAfterHeader.indexOf('- [');
        if (checkboxIndex !== -1) {
            questionText = contentAfterHeader.substring(0, checkboxIndex).trim();
        } else {
            // If no checkboxes found, look for other option formats
            const otherOptionIndex = Math.min(
                contentAfterHeader.indexOf('- ') !== -1 ? contentAfterHeader.indexOf('- ') : Infinity,
                contentAfterHeader.indexOf('* ') !== -1 ? contentAfterHeader.indexOf('* ') : Infinity,
                contentAfterHeader.indexOf('A.') !== -1 ? contentAfterHeader.indexOf('A.') : Infinity,
                contentAfterHeader.indexOf('A)') !== -1 ? contentAfterHeader.indexOf('A)') : Infinity
            );
            
            if (otherOptionIndex !== Infinity) {
                questionText = contentAfterHeader.substring(0, otherOptionIndex).trim();
            } else {
                // If still no options found, keep the section as is
                return section;
            }
        }
        
        // Extract options section (everything between question text and details/explanation)
        let optionsSection = '';
        let detailsSection = '';
        
        // Find the details tag
        const detailsIndex = contentAfterHeader.indexOf('<details>');
        if (detailsIndex !== -1) {
            optionsSection = contentAfterHeader.substring(checkboxIndex !== -1 ? checkboxIndex : 0, detailsIndex).trim();
            detailsSection = contentAfterHeader.substring(detailsIndex);
        } else {
            // Look for other explanation indicators
            const answerIndex = contentAfterHeader.indexOf('**Answer');
            const correctIndex = contentAfterHeader.indexOf('**Correct');
            const explanationIndex = contentAfterHeader.indexOf('**Explanation');
            
            let splitIndex = Math.min(
                answerIndex !== -1 ? answerIndex : Infinity,
                correctIndex !== -1 ? correctIndex : Infinity,
                explanationIndex !== -1 ? explanationIndex : Infinity
            );
            
            if (splitIndex !== Infinity) {
                optionsSection = contentAfterHeader.substring(checkboxIndex !== -1 ? checkboxIndex : 0, splitIndex).trim();
                detailsSection = `<details>\n<summary>Show Answer</summary>\n\n${contentAfterHeader.substring(splitIndex)}\n</details>`;
            } else {
                // If no explanation found, assume everything after options is the explanation
                const lines = contentAfterHeader.split('\n');
                let lastOptionLine = 0;
                
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].match(/^- \[|^- |^\* |^[A-Z][.)]/) && i > lastOptionLine) {
                        lastOptionLine = i;
                    }
                }
                
                if (lastOptionLine > 0 && lastOptionLine < lines.length - 1) {
                    const beforeOptions = lines.slice(0, lastOptionLine + 1).join('\n');
                    const afterOptions = lines.slice(lastOptionLine + 1).join('\n');
                    
                    optionsSection = beforeOptions.substring(checkboxIndex !== -1 ? checkboxIndex : 0).trim();
                    detailsSection = `<details>\n<summary>Show Answer</summary>\n\n${afterOptions.trim()}\n</details>`;
                } else {
                    // Can't reliably split, keep everything as options
                    optionsSection = contentAfterHeader.substring(checkboxIndex !== -1 ? checkboxIndex : 0).trim();
                    detailsSection = '<details>\n<summary>Show Answer</summary>\n\n**Correct Answers:** \n**Explanation:** Unable to extract explanation\n</details>';
                }
            }
        }
        
        // Process options to add letter prefixes
        const optionLines = optionsSection.split('\n').filter(line => line.trim().length > 0);
        let formattedOptions = '';
        let letterIndex = 0;
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        const correctLetters = [];
        
        for (const line of optionLines) {
            if (letterIndex >= letters.length) break;
            
            // Check if line is an option
            if (line.match(/^- \[|^- |^\* |^[A-Z][.)]/) || line.match(/^\d+[.)]/) || line.match(/^true|^false/i)) {
                const letter = letters[letterIndex];
                
                // Check if option is marked correct (with checkmark, x, or in explanation)
                const isCorrect = line.includes('✅') || 
                                line.includes('✓') || 
                                line.match(/- \[x\]/i) ||
                                (detailsSection.toLowerCase().includes('true') && line.toLowerCase().includes('true')) ||
                                (detailsSection.toLowerCase().includes('false') && line.toLowerCase().includes('false')) ||
                                detailsSection.includes(line.replace(/^- \[\s\]/, '').trim());
                
                if (isCorrect) {
                    correctLetters.push(letter);
                }
                
                // Extract option text, removing any existing prefix
                let optionText = line;
                optionText = optionText
                    .replace(/^- \[[x✓✅\s]\] /, '')
                    .replace(/^- /, '')
                    .replace(/^\* /, '')
                    .replace(/^[A-Z][.)] /, '')
                    .replace(/^\d+[.)] /, '')
                    .trim();
                
                formattedOptions += `- [ ] ${letter}. ${optionText}\n\n`;
                letterIndex++;
            }
        }
        
        // Process details section
        let formattedDetails = detailsSection;
        
        // Check if details section has the correct format
        if (!formattedDetails.includes('<summary>Show Answer</summary>')) {
            formattedDetails = formattedDetails.replace(/<details>/, '<details>\n<summary>Show Answer</summary>');
        }
        
        // Check for correct answers format
        const hasCorrectAnswers = formattedDetails.match(/\*\*Correct Answers?:\*\*\s+[A-Z,\s]+/i);
        
        if (!hasCorrectAnswers && correctLetters.length > 0) {
            // Add correct answers line
            formattedDetails = formattedDetails.replace(/<summary>Show Answer<\/summary>\s*\n/, 
                `<summary>Show Answer</summary>\n\n**Correct Answers:** ${correctLetters.join(', ')}\n`);
        } else if (!hasCorrectAnswers) {
            // Try to extract from explanation
            const explanationMatch = formattedDetails.match(/<summary>Show Answer<\/summary>([\s\S]*?)(?:<\/details>|$)/);
            if (explanationMatch) {
                const explanationText = explanationMatch[1];
                
                // Look for answer indicators
                if (explanationText.includes('✅') || explanationText.includes('correct') || explanationText.includes('true')) {
                    // For true/false questions
                    if (questionType === 'True/False') {
                        if (explanationText.toLowerCase().includes('true')) {
                            correctLetters.push('A');
                        } else if (explanationText.toLowerCase().includes('false')) {
                            correctLetters.push('B');
                        }
                    }
                    
                    // Add inferred correct answers
                    if (correctLetters.length > 0) {
                        formattedDetails = formattedDetails.replace(/<summary>Show Answer<\/summary>\s*\n/, 
                            `<summary>Show Answer</summary>\n\n**Correct Answers:** ${correctLetters.join(', ')}\n`);
                    } else {
                        formattedDetails = formattedDetails.replace(/<summary>Show Answer<\/summary>\s*\n/, 
                            `<summary>Show Answer</summary>\n\n**Correct Answers:** [Need to manually determine]\n`);
                    }
                } else {
                    formattedDetails = formattedDetails.replace(/<summary>Show Answer<\/summary>\s*\n/, 
                        `<summary>Show Answer</summary>\n\n**Correct Answers:** [Need to manually determine]\n`);
                }
            }
        }
        
        // Rebuild the section
        return `${header}\n${questionText}\n\n${formattedOptions}${formattedDetails}`;
    });
    
    // Join all sections back together
    const processedContent = processedSections.join('\n\n');
    
    // Write the processed content back to the file
    fs.writeFileSync(file, processedContent);
    console.log(`Standardized: ${file}`);
});

console.log('All files have been standardized!');