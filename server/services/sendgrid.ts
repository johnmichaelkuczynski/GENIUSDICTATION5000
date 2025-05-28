import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailOptions {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Send email using SendGrid
 * @param options Email configuration
 * @returns Promise<boolean> indicating success
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SendGrid API key is not configured');
    }

    const msg: any = {
      to: options.to,
      from: options.from,
      subject: options.subject,
    };

    if (options.html) {
      msg.html = options.html;
    }
    if (options.text) {
      msg.text = options.text;
    }

    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

/**
 * Send processed text via email with proper mathematical notation
 * @param to Recipient email address
 * @param from Sender email address (must be verified in SendGrid)
 * @param subject Email subject
 * @param processedText The transformed text content
 * @returns Promise<boolean> indicating success
 */
export async function sendProcessedText(
  to: string,
  from: string,
  subject: string,
  processedText: string
): Promise<boolean> {
  try {
    // Create HTML version with KaTeX for mathematical notation
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
        <style>
          body {
            font-family: 'Times New Roman', serif;
            font-size: 14pt;
            line-height: 1.6;
            margin: 40px;
            color: #333;
            max-width: 800px;
          }
          h1, h2, h3 {
            color: #2c3e50;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
          }
          p {
            margin-bottom: 1em;
            text-align: justify;
          }
          .katex {
            font-size: 1em;
          }
          .katex-display {
            margin: 1em 0;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12pt;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="content">
          ${processedText.split('\n').map(line => 
            line.trim() ? `<p>${line.trim()}</p>` : ''
          ).join('')}
        </div>
        
        <div class="footer">
          <p>This content was processed and shared using Genius Dictation.</p>
        </div>
        
        <script>
          document.addEventListener("DOMContentLoaded", function() {
            renderMathInElement(document.body, {
              delimiters: [
                {left: "$$", right: "$$", display: true},
                {left: "$", right: "$", display: false},
                {left: "\\\\[", right: "\\\\]", display: true},
                {left: "\\\\(", right: "\\\\)", display: false}
              ],
              throwOnError: false
            });
          });
        </script>
      </body>
      </html>
    `;

    // Plain text version (fallback)
    const plainText = processedText + '\n\n---\nThis content was processed and shared using Genius Dictation.';

    return await sendEmail({
      to,
      from,
      subject,
      text: plainText,
      html: htmlContent
    });
  } catch (error) {
    console.error('Error sending processed text:', error);
    return false;
  }
}