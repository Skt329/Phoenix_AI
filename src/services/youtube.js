import { YoutubeTranscript } from 'youtube-transcript';

// Function to extract transcript from YouTube video
export async function YouTube(videoUrl, message) {
  try {
    
    const transcriptObjects = await YoutubeTranscript.fetchTranscript(videoUrl);
     // Convert transcript objects to a readable string format
     const transcript = transcriptObjects.map(obj => obj.text).join(' ');

      // Combine transcript with user prompt
      const combinedMessage = `${transcript}\n\n${message}`;

return combinedMessage;
   
  } catch (error) {
    console.error('Error extracting YouTube transcript:', error);
    return 'Error extracting YouTube transcript';
  }
}



// Function to generate YouTube video playback link
export function generateYouTubePlaybackLink(videoUrl) {
  try {
    const videoId = ytdl.getVideoID(videoUrl);
    return `https://www.youtube.com/watch?v=${videoId}`;
  } catch (error) {
    console.error('Error generating playback link:', error);
    return null;
  }
}