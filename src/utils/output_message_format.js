// Function to escape special characters in code blocks
function escapeCodeBlock(text) {
    // In code blocks, only escape backticks and backslashes
    return text.replace(/[`\\]/g, '\\$&');
}

// Function to escape special characters in link URLs
function escapeLinkUrl(text) {
    // In URLs, only escape parentheses and backslashes
    return text.replace(/[)\\]/g, '\\$&');
}

// Function to escape special characters in regular text
function escapeRegularText(text) {
    // First, temporarily replace valid markdown formatting
    text = text.replace(/\*\*(.*?)\*\*/g, '§BOLD§$1§BOLD§');
    text = text.replace(/\*(.*?)\*/g, '§ITALIC§$1§ITALIC§');

    // Escape special characters for MarkdownV2
    text = text.replace(/([_\[\]()~`>#+=|{}.!-])/g, '\\$1');

    // Restore markdown formatting
    text = text.replace(/§BOLD§(.*?)§BOLD§/g, '**$1**');
    text = text.replace(/§ITALIC§(.*?)§ITALIC§/g, '*$1*');

    return text;
}

// Function to handle inline links
function formatLinks(text) {
    // Match markdown links [text](url)
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

    return text.replace(linkPattern, (match, linkText, url) => {
        const escapedText = escapeRegularText(linkText);
        const escapedUrl = escapeLinkUrl(url);
        return `[${escapedText}](${escapedUrl})`;
    });
}

// Main formatting function
export function formatTelegramMessage(text) {
    // Early return for empty or null text
    if (!text) return '';

    // Split the text into segments: code blocks and regular text
    const segments = text.split(/(```[\s\S]*?```|`[^`]*`)/g);

    let formatted = segments.map((segment) => {
        // Handle multiline code blocks
        if (segment.startsWith('```') && segment.endsWith('```')) {
            const language = segment.split('\n')[0].slice(3);
            const code = segment
                .slice(segment.indexOf('\n') + 1, -3)
                .trim();
            return '```' + language + '\n' + escapeCodeBlock(code) + '```';
        }

        // Handle inline code
        if (segment.startsWith('`') && segment.endsWith('`')) {
            const code = segment.slice(1, -1);
            return '`' + escapeCodeBlock(code) + '`';
        }

        // Handle regular text with links
        if (segment.trim()) {
            let processed = formatLinks(segment);
            return escapeRegularText(processed);
        }

        return segment;
    }).join('');

    // Handle edge cases for lists and line breaks
    formatted = formatted
        // Ensure proper spacing after list markers
        .replace(/^([\s]*)[•\-*+](\s*)/gm, '$1• ')
        // Preserve line breaks
        .replace(/\n/g, '\n');

    return formatted;
}