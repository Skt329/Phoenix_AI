export async function constraints(prompt, bot, chatId) {
    const OwnerWords = ['Saurab', 'Saurabh', 'Saurav', 'Tiwari', 'tivari', 'Tiwary', 'soura', 'saur', 'tiwa'];

    // Function to create a regex pattern that allows repeated letters in a word
    function createPatternWithRepeatedLetters(word) {
        const letters = word.split('');
        const pattern = letters.map(letter => `${letter}+`).join('');
        return pattern;
    }

    // Build the regex pattern
    const ownerPatterns = OwnerWords.map(word => createPatternWithRepeatedLetters(word));
    const regexx = new RegExp(`(${ownerPatterns.join('|')})`, 'i');

    // Check if the input text matches the pattern
    if (regexx.test(prompt)) {
        await bot.sendMessage(chatId, 'Maalik pe no Comment.');
        return; // Stop further processing
    }
}