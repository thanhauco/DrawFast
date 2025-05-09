
'use server';
/**
 * @fileOverview An AI flow to generate diagrams based on text prompts.
 *
 * - generateDiagram - A function that takes a user prompt and returns an array of shapes for a diagram.
 * - AiPromptInput - The input type for the generateDiagram function (re-exported from draw.zod.ts).
 * - AiGeneratedShapes - The return type for the generateDiagram function (re-exported from draw.zod.ts).
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod'; 
import {
  AiPromptInputSchema,
  AiGeneratedShapesSchema,
  type AiPromptInput as GenDiagramInput, // Alias to avoid conflict if this file also defines AiPromptInput
  type AiGeneratedShapes as GenDiagramOutput,
} from '@/types/draw.zod';

// Re-export types for use in components with clearer names for this specific flow
export type { GenDiagramInput as AiPromptInput, GenDiagramOutput as AiGeneratedShapes };


export async function generateDiagram(input: GenDiagramInput): Promise<GenDiagramOutput> {
  return generateDiagramFlow(input);
}

const diagramPrompt = ai.definePrompt({
  name: 'generateDiagramPrompt',
  input: { schema: AiPromptInputSchema },
  output: { schema: AiGeneratedShapesSchema },
  prompt: `You are an expert diagramming assistant. Based on the user's prompt, generate a diagram (e.g., flowchart, process diagram, mind map).
The diagram should be represented as an array of shapes. Each shape must conform to the JSON schema provided for the output.

Key considerations for shape generation:
- Canvas Context: Assume a canvas that is roughly 1000px wide and 700px high for initial layout. Shapes should be reasonably sized and positioned within this conceptual space. Strive for clarity and avoid unnecessary overlaps.
- IDs: Every shape must have a unique ID for its 'id' field (e.g., a v4 UUID string).
- Coordinates:
    - For 'rectangle': 'x' and 'y' are the top-left coordinates. 'width' and 'height' are required.
    - For 'circle': 'x' and 'y' are the center coordinates. 'radius' is required.
    - For 'line' and 'arrow': 'points' must be an array of two absolute coordinate points: [ {x, y}, {x, y} ]. The top-level 'x' and 'y' for these shapes can be 0 or the coordinates of the first point in the 'points' array.
    - For 'text': 'x' and 'y' are the top-left starting coordinates of the text. The 'text' field is required. 'width' and 'height' are optional but helpful if you can estimate them.
- Styling:
    - Use standard colors like '#000000' for strokes, and 'transparent' or specific hex colors (e.g., '#FFFFFF', '#F0F0F0') for fills.
    - 'strokeWidth' should typically be between 1 and 3.
    - 'fontSize' for text should be reasonable (e.g., 12, 14, 16, 18).
    - 'fontFamily' can be "Arial, sans-serif".
    - For 'text' shapes, 'fillColor' should usually be 'transparent', and 'strokeColor' determines the text color.
- Connectivity: For diagrams like flowcharts, use 'arrow' shapes to connect elements. Ensure arrow points logically connect related shapes, ideally pointing to the edge or center of shapes.
- Content: Interpret the user's prompt to create meaningful content within shapes (for 'text' shapes or labels implied by the diagram type).
- Completeness and Detail: Your goal is to create a diagram that accurately and comprehensively reflects the user's prompt.
    - Ensure all key elements, steps, components, or ideas mentioned in the prompt are represented by one or more shapes.
    - Generate a sufficient number of shapes. For simple prompts, this might be 3-5 shapes. For more complex or detailed prompts, aim for 10-20 shapes or more, as needed to capture the full intent. Do not oversimplify.
    - If the prompt suggests relationships or connections, use appropriate connecting shapes (lines, arrows).
    - Use a variety of appropriate shape types (rectangles, circles, text labels) to clearly distinguish different elements.

User prompt: {{{prompt}}}

Generate the JSON output. The output must be a single JSON object with a "shapes" key, and its value must be an array of shape objects.
Do not include any markdown formatting (like \`\`\`json ... \`\`\`) or any other text or explanations outside the JSON.
Example of expected output format:
{
  "shapes": [
    {
      "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      "type": "rectangle",
      "x": 50,
      "y": 50,
      "width": 150,
      "height": 75,
      "style": {
        "strokeColor": "#000000",
        "fillColor": "#FFFFFF",
        "strokeWidth": 2,
        "fontSize": 14,
        "fontFamily": "Arial, sans-serif"
      }
    },
    {
      "id": "b2c3d4e5-f6g7-8901-2345-678901bcdefg",
      "type": "text",
      "x": 60,
      "y": 70,
      "text": "Start Node",
      "style": {
        "strokeColor": "#333333",
        "fillColor": "transparent",
        "strokeWidth": 1,
        "fontSize": 16,
        "fontFamily": "Arial, sans-serif"
      }
    }
    // ... more shapes
  ]
}
`,
});

const generateDiagramFlow = ai.defineFlow(
  {
    name: 'generateDiagramFlow',
    inputSchema: AiPromptInputSchema,
    outputSchema: AiGeneratedShapesSchema,
  },
  async (input: GenDiagramInput): Promise<GenDiagramOutput> => {
    const { output } = await diagramPrompt(input);
    
    if (!output || !output.shapes) {
      console.error('AI generation for diagram failed or returned invalid data structure. Output:', output);
      // Return an empty array of shapes to prevent runtime errors downstream
      return { shapes: [] };
    }
    // Ensure shapes is always an array, even if the LLM returns null or undefined for it.
    return { shapes: Array.isArray(output.shapes) ? output.shapes : [] };
  }
);

