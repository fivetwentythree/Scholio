const fs = require('fs');

// Function to parse YAML front matter
function parseYAMLFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return { content, metadata: {} };
  
  const yamlContent = match[1];
  const metadata = {};
  const lines = yamlContent.split('\n');
  
  lines.forEach(line => {
    const [key, ...values] = line.split(':').map(s => s.trim());
    if (key && values.length) metadata[key] = values.join(':');
  });
  
  return {
    content: content.slice(match[0].length),
    metadata
  };
}

// Function to convert markdown with annotations to HTML
function convertMarkdownToAnnotatedHTML(markdownContent, outputFile) {
  // Parse YAML front matter
  const { content: contentWithoutYAML, metadata } = parseYAMLFrontMatter(markdownContent);
  
  // Parse annotations
  const annotations = {};
  let contentWithoutAnnotations = contentWithoutYAML;
  
  // Extract footnote-style annotations
  const footnoteRegex = /\[\^(\d+)\]:\s*([\s\S]*?)(?=\n\s*\n|\n\[\^|$)/g;
  let footnoteMatch;
  
  while ((footnoteMatch = footnoteRegex.exec(contentWithoutYAML)) !== null) {
    const id = footnoteMatch[1];
    let content = footnoteMatch[2].trim();
    
    // Parse threaded comments (lines starting with -)
    const lines = content.split('\n');
    const mainContent = lines[0];
    const threads = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('- ')) {
        threads.push({
          content: line.substring(2),
          level: 1 + Math.floor((lines[i].length - lines[i].trimLeft().length) / 2)
        });
      }
    }
    
    annotations[id] = {
      content: mainContent,
      threads: threads
    };
    
    // Remove the annotation from the markdown
    contentWithoutAnnotations = contentWithoutAnnotations.replace(footnoteMatch[0], '');
  }
  
  // Split content into sections by horizontal rules
  const sections = contentWithoutAnnotations.split(/\n---\n/).map(section => section.trim());
  
  // Use metadata from YAML front matter
  const title = metadata.title || 'Annotated Document';
  const author = metadata.author || '';
  const source = metadata.source || '';
  const publicationYear = metadata.year || '';
  const annotator = metadata.annotator || '';
  
  // Generate HTML
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    :root {
      --primary-color: #96B78A;
      --text-color: #333;
      --bg-color: #fcfcfc;
      --annotation-bg: #f5f5f5;
      --mark-color: rgba(150, 183, 138, 0.4);
      --divider-color: #ddd;
      --spacing-unit: clamp(0.5rem, 2vw, 1rem);
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      color: var(--text-color);
      background-color: var(--bg-color);
      margin: 0;
      padding: 0;
      font-size: clamp(16px, 3vw, 18px);
    }
    .title-block {
      text-align: center;
      padding: var(--spacing-unit);
      background-color: var(--primary-color);
      color: white;
      margin-bottom: var(--spacing-unit);
    }
    .byline {
      font-style: italic;
      margin-top: 0.5rem;
    }
    .intro {
      max-width: min(800px, 95%);
      margin: 0 auto var(--spacing-unit);
      padding: 0 var(--spacing-unit);
    }
    .small {
      font-size: 0.85rem;
      color: #666;
    }
    .maincontent {
      max-width: min(1200px, 95%);
      margin: 0 auto;
      padding: 0 var(--spacing-unit);
    }
    .group {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--spacing-unit);
      padding-bottom: var(--spacing-unit);
      border-bottom: 1px solid var(--divider-color);
    }
    @media (min-width: 768px) {
      .group {
        grid-template-columns: 2fr 1fr;
      }
    }
    .group.first {
      padding-top: 0;
    }
    .group.last {
      border-bottom: none;
    }
    .content {
      padding: var(--spacing-unit);
    }
    .quote {
      font-size: clamp(1rem, 2.5vw, 1.1rem);
    }
    .note {
      background-color: var(--annotation-bg);
      border-radius: 0.5rem;
    }
    mark {
      cursor: pointer;
      position: relative;
      background-color: transparent;
    }
    mark::after {
      content: attr(data-annotation-id);
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-left: 0.2em;
      font-size: clamp(0.7em, 2vw, 0.75em);
      font-weight: 500;
      width: 1.5em;
      height: 1.5em;
      border-radius: 50%;
      border: 1.5px solid var(--text-color);
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      vertical-align: super;
      -webkit-tap-highlight-color: transparent;
    }
    .annotation-group {
      margin-bottom: var(--spacing-unit);
      padding-left: calc(var(--spacing-unit) * 0.5);
      border-left: 3px solid var(--primary-color);
    }
    .annotation {
      margin-bottom: 0.5rem;
    }
    .commenter {
      font-weight: bold;
      margin-bottom: 0.25rem;
    }
    .thread {
      margin-left: 1rem;
      padding-left: 0.5rem;
      border-left: 2px solid var(--primary-color);
    }
    .thread-2 {
      margin-left: 2rem;
    }
    .thread-3 {
      margin-left: 3rem;
    }
    .outro {
      max-width: 800px;
      margin: 3rem auto;
      padding: 1rem;
      text-align: center;
      border-top: 1px solid var(--divider-color);
      padding-top: 2rem;
    }
    .fine-print {
      font-size: 0.85rem;
      color: #666;
      margin-top: 1rem;
    }
    a {
      color: #5B8266;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .highlight {
      background-color: rgba(150, 183, 138, 0.2);
      border-left-color: #5B8266;
    }
    .active {
      background-color: rgb(255, 255, 255);
    }
  </style>
</head>
<body>
  <div class="title-block">
    <h1>${title}</h1>
    <div class="byline">
      By ${author}${source ? `, <a href="${source}">originally published</a>` : ''} 
      ${publicationYear ? `in ${publicationYear}` : ''}
    </div>
    ${annotator ? `<div class="byline">Annotations by ${annotator}.</div>` : ''}
  </div>
  <div class="intro">
    <p>Introductory text goes here.</p>
    <p class="small">
      Use the <code>small</code> class to add explanatory notes.
    </p>
  </div>
  <main class="maincontent">
    <article class="article">`;

  // Process each section
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const isFirst = i === 1;
    const isLast = i === sections.length - 1;
    
    // Process annotations in this section
    let processedSection = section;
    const sectionAnnotations = [];
    
    // Replace annotation markers with marks
    Object.keys(annotations).forEach(id => {
      const markerRegex = new RegExp(`\\^${id}`, 'g');
      if (markerRegex.test(processedSection)) {
        processedSection = processedSection.replace(
          markerRegex,
          `<mark data-annotation-id="${id}" aria-details="annotation-${id}"></mark>`
        );
        sectionAnnotations.push(id);
      }
    });
    
    // Simple markdown to HTML conversion for paragraphs
    const paragraphs = processedSection.split('\n\n').map(p => `<p>${p}</p>`).join('\n');
    
    // Add the section
    html += `
      <section class="group${isFirst ? ' first' : ''}${isLast ? ' last' : ''}">
        <div class="content quote">
          ${paragraphs}
        </div>`;
    
    // Add annotations for this section
    if (sectionAnnotations.length > 0) {
      html += `
        <div class="content note">`;
      
      sectionAnnotations.forEach(id => {
        const annotation = annotations[id];
        const parts = annotation.content.split(':');
        let commenter = '';
        let content = annotation.content;
        
        if (parts.length > 1) {
          commenter = parts[0].trim();
          content = parts.slice(1).join(':').trim();
        }
        
        html += `
          <div class="annotation-group" role="comment" data-annotation-id="${id}" id="annotation-${id}">
            <div class="annotation">
              ${commenter ? `<div class="commenter">${commenter}</div>` : ''}
              ${content}
            </div>`;
        
        // Add threaded responses
        if (annotation.threads.length > 0) {
          annotation.threads.forEach(thread => {
            const threadParts = thread.content.split(':');
            let threadCommenter = '';
            let threadContent = thread.content;
            
            if (threadParts.length > 1) {
              threadCommenter = threadParts[0].trim();
              threadContent = threadParts.slice(1).join(':').trim();
            }
            
            html += `
              <div class="annotation thread thread-${thread.level}">
                ${threadCommenter ? `<div class="commenter">${threadCommenter}</div>` : ''}
                ${threadContent}
              </div>`;
          });
        }
        
        html += `
          </div>`;
      });
      
      html += `
        </div>`;
    }
    
    html += `
      </section>`;
  }

  html += `
    </article>
  </main>
  <footer class="outro">
    <div class="fine-print">
      <p>
        Page built with the Annotation System.
      </p>
    </div>
  </footer>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // Find all marks
      const marks = document.querySelectorAll('mark');
      
      // Add click event to highlight associated annotation
      marks.forEach(mark => {
        mark.addEventListener('click', function() {
          const annotationId = this.getAttribute('aria-details');
          const annotation = document.getElementById(annotationId);
          
          // Remove highlight from all annotations
          document.querySelectorAll('.annotation-group').forEach(anno => {
            anno.classList.remove('highlight');
          });
          
          // Add highlight to the selected annotation
          if (annotation) {
            annotation.classList.add('highlight');
            annotation.scrollIntoView({behavior: 'smooth', block: 'center'});
          }
        });
      });
      
      // Add hover effect
      marks.forEach(mark => {
        mark.addEventListener('mouseenter', function() {
          const annotationId = this.getAttribute('data-annotation-id');
          document.querySelectorAll(\`mark[data-annotation-id="\${annotationId}"]\`).forEach(m => {
            m.classList.add('active');
          });
        });
        
        mark.addEventListener('mouseleave', function() {
          const annotationId = this.getAttribute('data-annotation-id');
          document.querySelectorAll(\`mark[data-annotation-id="\${annotationId}"]\`).forEach(m => {
            m.classList.remove('active');
          });
        });
      });
      
      // Add annotation hover effect to show corresponding text
      document.querySelectorAll('.annotation-group').forEach(anno => {
        anno.addEventListener('mouseenter', function() {
          const annotationId = this.getAttribute('data-annotation-id');
          document.querySelectorAll(\`mark[data-annotation-id="\${annotationId}"]\`).forEach(m => {
            m.classList.add('active');
          });
        });
        
        anno.addEventListener('mouseleave', function() {
          const annotationId = this.getAttribute('data-annotation-id');
          document.querySelectorAll(\`mark[data-annotation-id="\${annotationId}"]\`).forEach(m => {
            m.classList.remove('active');
          });
        });
      });
    });
  </script>
</body>
</html>`;

  // Write the output file
  fs.writeFileSync(outputFile, html);
  return true;
}

// Example markdown content
const sampleMarkdown = `# The Velveteen Rabbit

By Margery Williams, [originally published](https://en.wikisource.org/wiki/The_Velveteen_Rabbit) in 1922

Annotations by Molly White.

## Introduction

Introductory text goes here.

*Use the small class to add explanatory notes.*

---

There was once a velveteen rabbit, and in the beginning he was really splendid. He was fat and bunchy^1, as a rabbit should be; his coat was spotted brown and white, he had real thread whiskers, and his ears were lined with pink sateen.

[^1]: Molly White: A standalone comment. There's only one in this paragraph, so it doesn't have a number.

---

There were other things in the stocking, nuts and oranges and a toy engine, and chocolate almonds and a clockwork mouse, but the Rabbit was quite the best of all. For at least two hours the Boy loved him, and then Aunts and Uncles came to dinner, and there was a great rustling of tissue paper and unwrapping of parcels, and in the excitement of looking at all the new presents the Velveteen Rabbit was forgotten.

---

For a long time he lived in the toy cupboard or on the nursery floor, and no one thought very much about him. He was naturally shy, and being only made of velveteen, some of the more expensive toys quite snubbed him. The mechanical toys were very superior, and looked down upon every one else; they were full of modern ideas, and pretended they were real. The model boat, who had lived through two seasons and lost most of his paint, caught the tone from them and never missed an opportunity of referring to his rigging in technical terms. The Rabbit could not claim to be a model of anything, for he didn't know that real rabbits existed^2; he thought they were all stuffed with sawdust like himself, and he understood that sawdust was quite out-of-date and should never be mentioned in modern circles. Even Timothy, the jointed wooden lion, who was made by the disabled soldiers, and should have had broader views, put on airs and pretended he was connected with Government^3. Between them all the poor little Rabbit was made to feel himself very insignificant and commonplace, and the only person who was kind to him at all was the Skin Horse.

[^2]: Molly White: A comment with indented responses.
    - Another commenter: A reply!
    - Molly White: A retort!

[^3]: Molly White: Another standalone comment. This one has a response, but it isn't indented because it doesn't have the thread class applied.
    - Molly White: A reply!`;

// Process from file if path provided, otherwise use sample
if (process.argv.length > 2) {
  const inputFile = process.argv[2];
  const inputFileName = inputFile.split('/').pop();
  const outputFile = process.argv.length > 3 ? process.argv[3] : inputFileName.replace(/\.md$/, '.html');
  
  try {
    const markdownContent = fs.readFileSync(inputFile, 'utf8');
    console.log(`Converting ${inputFile} to ${outputFile}...`);
    if (convertMarkdownToAnnotatedHTML(markdownContent, outputFile)) {
      console.log(`Conversion complete! Open ${outputFile} in your browser.`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
} else {
  // Use the sample markdown
  console.log('No input file provided, using sample markdown...');
  if (convertMarkdownToAnnotatedHTML(sampleMarkdown, 'output.html')) {
    console.log('Conversion complete! Open output.html in your browser.');
  }
}