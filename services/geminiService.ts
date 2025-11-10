
import { GoogleGenAI, Modality, Content as GoogleChatMessage, Type } from "@google/genai";
import type { Place, Character, ScriptLine } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

type AspectRatio = '16:9' | '1:1' | '9:16' | '3:4' | '4:3';

export const generateImage = async (prompt: string, aspectRatio: AspectRatio = '16:9'): Promise<string> => {
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: aspectRatio,
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      return response.generatedImages[0].image.imageBytes;
    }
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

export const editImage = async (imageBase64: string, mimeType: string, prompt: string): Promise<string> => {
    try {
      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType,
        },
      };
      const textPart = {
        text: prompt,
      };
  
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, textPart] },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });
  
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return part.inlineData.data;
        }
      }
      throw new Error("No edited image generated.");
    } catch (error) {
      console.error("Error editing image:", error);
      throw error;
    }
};

export const enhancePrompt = async (scenePrompt: string): Promise<string> => {
  try {
    const prompt = `Brainstorm 3-5 interesting, concrete details to add to this scene description to make it more visually compelling for an AI image generator. Return only the enhanced prompt, without any preamble. Scene: "${scenePrompt}"`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });
    return response.text;
  } catch (error) {
    console.error("Error enhancing prompt:", error);
    throw error;
  }
};

export const generatePromptVariations = async (basePrompt: string, count: number): Promise<string[]> => {
    try {
      const prompt = `Generate ${count} creative and visually distinct variations for the following scene prompt. Focus on different angles, times of day, moods, and specific details. Return the results as a JSON object with a single key "prompts" which is an array of strings.
  
  Scene: "${basePrompt}"`;
  
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              prompts: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                  description: 'A creative and visually distinct scene prompt variation.'
                }
              }
            }
          }
        }
      });
  
      const jsonText = response.text.trim();
      const result = JSON.parse(jsonText);
      if (result && Array.isArray(result.prompts)) {
        return result.prompts;
      }
      throw new Error("Invalid JSON response format from AI.");
  
    } catch (error) {
      console.error("Error generating prompt variations:", error);
      throw error;
    }
  };

export const findLocationForPrompt = async (query: string, location: { latitude: number, longitude: number } | null): Promise<{ prompt: string, places: Place[] }> => {
    try {
        const geminiPrompt = `You are a film location scout. A user wants to find a real place that matches their description. Your task is to use Google Maps to find a suitable, specific location and then write a new, detailed, and visually compelling prompt for an AI image generator based on that real location. The new prompt should capture the unique atmosphere, lighting, and key visual elements of the place.
User's request: "${query}"

Return ONLY the new image prompt. The real-world location you found will be available in the grounding metadata.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: geminiPrompt,
            config: {
              tools: [{googleMaps: {}}],
              ...(location && {
                toolConfig: {
                  retrievalConfig: {
                    latLng: location
                  }
                }
              })
            },
        });
        
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const places: Place[] = chunks
            .filter(chunk => chunk.maps)
            .map(chunk => ({
                title: chunk.maps.title,
                uri: chunk.maps.uri
            }));

        return { prompt: response.text, places };

    } catch (error) {
        console.error("Error finding location:", error);
        throw error;
    }
}

export const rewritePromptForStyle = async (styleSeedImageBase64: string, mimeType: string, scenePrompt: string): Promise<string> => {
  try {
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: styleSeedImageBase64,
      },
    };
    const textPart = {
      text: `Analyze the attached image which is the 'style seed' for a creative project. It defines the entire visual language: mood, color palette, lighting, textures, and overall aesthetic. Now, take the following simple scene description and rewrite it into a highly detailed, evocative, and artistic prompt for an AI image generator. The new prompt MUST meticulously capture and replicate the specific style of the seed image. Do not mention the seed image in your output. Just return the new, detailed prompt.

Simple Scene Description: "${scenePrompt}"`
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
    });

    return response.text;
  } catch (error) {
    console.error("Error rewriting prompt:", error);
    throw error;
  }
};

export const generateCharacterBio = async (name: string, role: string): Promise<string> => {
    try {
        const prompt = `Write a short, creative character biography (2-3 sentences) for a character in a gritty, satirical, near-future sci-fi world. The bio should be punchy and hint at a larger story.
        
        Name: ${name}
        Role: ${role}
        
        Biography:`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        return response.text;
    } catch(error) {
        console.error("Error generating character bio:", error);
        throw error;
    }
}

export const generateDialogue = async (character: Character, history: ScriptLine[], allCharacters: Character[]): Promise<string> => {
    try {
        const historyString = history.slice(-6).map(line => {
            const speaker = line.characterId === 'narrator' ? 'Narrator' : allCharacters.find(c => c.id === line.characterId)?.name || 'Unknown';
            return `${speaker}: ${line.line}`;
        }).join('\n');

        const prompt = `You are a scriptwriter. Here is the character you need to write dialogue for:
Name: ${character.name}
Role: ${character.role}
Bio: ${character.bio || 'Not available.'}

Here is the recent dialogue history from the script:
${historyString}

Based on the character's personality and the context of the conversation, write their next line of dialogue. The line should be compelling and move the story forward. Return ONLY the line of dialogue, without the character's name or any other preamble.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        return response.text;
    } catch(error) {
        console.error("Error generating dialogue:", error);
        throw error;
    }
}


export const generateSpeech = async (text: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            return base64Audio;
        }
        throw new Error("No audio generated.");
    } catch (error) {
        console.error("Error generating speech:", error);
        throw error;
    }
};

export const getComplexResponse = async (history: GoogleChatMessage[], newMessage: string): Promise<string> => {
    const model = 'gemini-2.5-pro';
    try {
        const fullContents = [...history, { role: 'user', parts: [{ text: newMessage }] }];

        // FIX: Moved systemInstruction into the config object as per the API guidelines.
        const response = await ai.models.generateContent({
            model,
            contents: fullContents,
            config: {
                thinkingConfig: { thinkingBudget: 32768 },
                systemInstruction: "You are a world-class creative partner and story analyst. Your name is Co-Pilot (Thinking Mode). Provide deep, insightful, and comprehensive answers to help the user build their story. Analyze themes, suggest plot twists, and flesh out character motivations with expertise.",
            },
        });

        return response.text;
    } catch (error) {
        console.error(`Error with ${model}:`, error);
        throw error;
    }
};