
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {nextPlugin} from '@genkit-ai/next'; // Import nextPlugin

export const ai = genkit({
  plugins: [
    googleAI(),
    nextPlugin(), // Add nextPlugin for better Next.js integration
  ],
  model: 'googleai/gemini-2.0-flash',
});
