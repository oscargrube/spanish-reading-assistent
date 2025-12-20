
import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { PageAnalysisResult } from "../types";

// Helper to encode string to base64
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to decode base64 to bytes
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper to decode audio data
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    sentences: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING, description: "The EXACT verbatim sentence from the image. No omissions." },
          translation: { type: Type.STRING, description: "Natural German translation of the full sentence." },
          words: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING, description: "The word, phrase, punctuation, or space." },
                type: { type: Type.STRING, enum: ['word', 'punctuation'], description: "Use 'word' for lexical units/phrases, 'punctuation' for symbols/spaces." },
                translation: { type: Type.STRING, description: "German translation (required if type='word')." },
                explanation: { type: Type.STRING, description: "German Grammar/context explanation (required if type='word')." },
                category: { 
                  type: Type.STRING, 
                  enum: ['noun', 'verb', 'adjective', 'function'],
                  description: "Grammatical category."
                },
                baseForm: { type: Type.STRING, description: "Lemma/Infinitiv." }
              },
              required: ["word", "type"]
            }
          }
        },
        required: ["original", "translation", "words"]
      }
    }
  },
  required: ["sentences"]
};

// Always create a fresh instance to ensure we use the most up-to-date API Key from process.env
const getAI = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API Key is missing. Please select an API key.");
    }
    return new GoogleGenAI({ apiKey });
}

export const analyzeImage = async (base64Image: string): Promise<PageAnalysisResult> => {
  const ai = getAI();
  
  const prompt = `
    Analyze the attached Spanish book page. You are an expert Spanish teacher.
    
    CRITICAL INSTRUCTIONS:
    1. COMPLETE TRANSCRIPTION: You MUST process EVERY SINGLE SENTENCE visible on the page. Do not skip the first or last sentences. Scan line by line.
    2. PHRASE BINDING: Combine words that belong together into a SINGLE 'word' object:
       - Reflexive verbs: "se levantó", "me gusta", "irse".
       - Multi-word connectors: "tal vez", "por qué", "sin embargo", "a lo mejor", "de repente".
       - Idiomatic phrases: "tener que", "dar un paseo".
    3. FULL CHARACTER COVERAGE: The 'words' array for each sentence must reconstruct the 'original' string perfectly (including spaces and punctuation).
    4. DATA TYPES: 
       - 'punctuation': symbols, marks, or standalone spaces.
       - 'word': actual words or combined phrases.
    5. No placeholders. If you find text, you analyze it.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        systemInstruction: "You are a professional Spanish-to-German translator and linguist. Your goal is to extract ALL sentences from an image and group related lexical units like reflexive verbs and compound phrases as single items for a vocabulary learner.",
        thinkingConfig: { thinkingBudget: 12000 } 
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response text from Gemini.");
    
    return JSON.parse(text) as PageAnalysisResult;
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

export const generateSpeech = async (text: string): Promise<void> => {
  const ai = getAI();

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Puck' },
              },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
          throw new Error("No audio data returned");
      }

      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      const outputNode = outputAudioContext.createGain();
      outputNode.connect(outputAudioContext.destination);

      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        outputAudioContext,
        24000,
        1,
      );
      
      const source = outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputNode);
      source.start();

  } catch (error) {
      console.error("TTS failed:", error);
      throw error;
  }
}
