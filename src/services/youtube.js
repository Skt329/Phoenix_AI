import ytdl from 'ytdl-core';
import axios from 'axios';
import * as cheerio from 'cheerio';


// Function to extract transcript from YouTube video
export async function YouTube(videoUrl, message='Please summarize the video in detail in bullet points.') {
  try {
    const videoId = ytdl.getVideoID(videoUrl);
    const videoInfoUrl = `https://youtubetotranscript.com/transcript?v=${videoId}`;
    // Fetch the HTML content of the webpage
    const { data } = await axios.get(videoInfoUrl);

    // Load the HTML content into Cheerio
    const $ = cheerio.load(data);

    // Select the transcript element
    const transcriptElement = $('#transcript p');

    // Extract the text content of the transcript
    let transcript = '';
    transcriptElement.find('span').each((index, element) => {
      transcript += $(element).text() + ' ';
    });

    // Print the transcript
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

