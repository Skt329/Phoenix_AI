function convertToTelegramHTML(text) {
    if (!text) return '';

    // First extract code blocks and inline code with placeholders
    const codeBlocks = [];
    const inlineCode = [];
    let formatted = text;

    // Extract code blocks first (```code```)
    formatted = formatted.replace(/```([\s\S]+?)```/g, (match, code) => {
        codeBlocks.push(code.trim());  // Store only the code content, trimmed
        return `<<<CODE_BLOCK_${codeBlocks.length - 1}>>>`;
    });

    // Extract inline code (`code`)
    formatted = formatted.replace(/`([^`]+?)`/g, (match, code) => {
        inlineCode.push(code.trim());  // Store only the code content, trimmed
        return `<<<INLINE_CODE_${inlineCode.length - 1}>>>`;
    });

    // Escape special HTML characters in the remaining text
    // Split by placeholders to avoid escaping them
    const parts = formatted.split(/(<<<CODE_BLOCK_\d+>>>|<<<INLINE_CODE_\d+>>>)/g);
    formatted = parts.map(part => {
        if (part.startsWith('<<<CODE_BLOCK_') || part.startsWith('<<<INLINE_CODE_')) {
            return part;  // Don't escape placeholders
        }
        return part
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }).join('');

    // Apply formatting to non-code text
    const tagReplacements = [
        { regex: /\*\*(.+?)\*\*/g, replace: '<b>$1</b>' },
        { regex: /(\*|_)(.+?)\1/g, replace: '<i>$2</i>' },
        { regex: /~~(.+?)~~/g, replace: '<s>$1</s>' },  // Fixed strikethrough
        { regex: /__(.+?)__/g, replace: '<u>$1</u>' },  // Added underline with different syntax
        { regex: /\[([^\]]+?)\]\(([^)]+?)\)/g, replace: '<a href="$2">$1</a>' }
    ];

    // Apply formatting only to non-placeholder parts
    formatted = parts.map(part => {
        if (part.startsWith('<<<CODE_BLOCK_') || part.startsWith('<<<INLINE_CODE_')) {
            return part;
        }
        let formattedPart = part;
        tagReplacements.forEach(({ regex, replace }) => {
            formattedPart = formattedPart.replace(regex, replace);
        });
        return formattedPart;
    }).join('');

    // Restore code blocks
    formatted = formatted.replace(/<<<CODE_BLOCK_(\d+)>>>/g, (match, index) => {
        const code = codeBlocks[parseInt(index, 10)];
        if (!code) return match;
        return `<pre><code>${code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            }</code></pre>`;
    });

    // Restore inline code
    formatted = formatted.replace(/<<<INLINE_CODE_(\d+)>>>/g, (match, index) => {
        const code = inlineCode[parseInt(index, 10)];
        if (!code) return match;
        return `<code>${code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            }</code>`;
    });

    return formatted;
}
function findSafeSplitPosition(text, maxLength) {
    let splitPos = maxLength;

    // First check for unclosed <pre> and <code> tags
    const codeBlockRegex = /<pre><code[\s\S]*?<\/code><\/pre>/g;
    let match;
    let lastCodeBlockEnd = 0;

    while ((match = codeBlockRegex.exec(text)) !== null) {
        const blockStart = match.index;
        const blockEnd = blockStart + match[0].length;

        // If the split position is inside a code block, move it before the block
        if (splitPos > blockStart && splitPos < blockEnd) {
            splitPos = blockStart;
            break;
        }
        lastCodeBlockEnd = blockEnd;
    }

    // Check for other HTML tags
    const tagPattern = /<\/?([a-zA-Z0-9-]+)(?:\s[^>]*)?>/g;
    const sensitiveTags = ['b', 'i', 'u', 's', 'code', 'pre', 'a'];
    const openTags = [];

    let tagMatch;
    while ((tagMatch = tagPattern.exec(text)) !== null && tagMatch.index < splitPos) {
        const tag = tagMatch[0];
        const tagName = tagMatch[1];
        const isClosingTag = tag.startsWith('</');

        if (!sensitiveTags.includes(tagName)) continue;

        if (isClosingTag) {
            const index = openTags.lastIndexOf(tagName);
            if (index !== -1) {
                openTags.splice(index, 1);
            }
        } else {
            openTags.push(tagName);
        }
    }

    // If we have unclosed tags, move split position before the last unclosed tag
    if (openTags.length > 0) {
        const lastUnclosedTag = openTags[openTags.length - 1];
        const lastUnclosedTagPos = text.lastIndexOf('<' + lastUnclosedTag, splitPos);
        if (lastUnclosedTagPos > -1) {
            splitPos = lastUnclosedTagPos;
        }
    }

    // Find the last complete sentence or line before the split position
    const lastPeriod = text.lastIndexOf('. ', splitPos);
    const lastNewline = text.lastIndexOf('\n', splitPos);
    const lastSpace = text.lastIndexOf(' ', splitPos);

    // Prefer splitting at sentence end, then line end, then word boundary
    if (lastPeriod > 0 && splitPos - lastPeriod < 100) {
        return lastPeriod + 1;
    } else if (lastNewline > 0 && splitPos - lastNewline < 50) {
        return lastNewline + 1;
    } else if (lastSpace > 0) {
        return lastSpace;
    }

    return splitPos;
}
// Main function to format and split messages
function formatTelegramHTMLMessage(text) {
    if (!text) return [];

    const MAX_LENGTH = 4096; // Telegram's message length limit
    const formattedText = convertToTelegramHTML(text);

    if (formattedText.length <= MAX_LENGTH) {

        return [formattedText];
    }

    const messages = [];
    let remainingText = formattedText;


    while (remainingText.length > 0) {
        if (remainingText.length <= MAX_LENGTH) {
            messages.push(remainingText);

            break;
        }

        const splitPos = findSafeSplitPosition(remainingText, MAX_LENGTH);

        // Guard against infinite loop
        if (splitPos <= 0) {
            // Unable to find a safe split position; force split at MAX_LENGTH
            messages.push(remainingText.substring(0, MAX_LENGTH));
            remainingText = remainingText.substring(MAX_LENGTH);
        } else {
            const chunk = remainingText.substring(0, splitPos).trim();
            messages.push(chunk);

            remainingText = remainingText.substring(splitPos).trim();
        }

    }

    return messages;
}
export async function Output (text,bot,chatId) {
    const messageChunks =  formatTelegramHTMLMessage(text);
// Send each chunk as a separate message
for (const chunk of messageChunks) {
  await bot.sendMessage(chatId, chunk, {
    parse_mode: 'HTML',
  });
}
}

// New function to handle AI response, format, split, and sort
export function handleAIResponse(response) {
    if (!response) return [];
  
    // Format and split the response
    const formattedMessages = formatTelegramHTMLMessage(response);
  
    // Sort the messages
    formattedMessages.sort();
  
    return formattedMessages;
  }