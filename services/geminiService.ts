import { GoogleGenAI, Type, Modality } from "@google/genai";
import { PageAnalysisResult } from "../types";
import { getSessionApiKey } from "./storageService";

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

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

const wordProperties = {
  word: { type: Type.STRING, description: "The word, phrase, punctuation, or space." },
  type: { type: Type.STRING, enum: ['word', 'punctuation'], description: "Use 'word' for lexical units/phrases, 'punctuation' for symbols/spaces." },
  translation: { type: Type.STRING, description: "German translation (required if type='word')." },
  literalTranslation: { type: Type.STRING, description: "Literal 'word-for-word' German translation if different from meaning (e.g. 'hacer calor' -> 'Wärme machen')." },
  explanation: { type: Type.STRING, description: "Detailed German Grammar/context explanation." },
  category: { 
    type: Type.STRING, 
    enum: ['noun', 'verb', 'adjective', 'function'],
    description: "Grammatical category."
  },
  baseForm: { type: Type.STRING, description: "Lemma/Infinitiv (ALWAYS required for verbs)." },
  tense: { type: Type.STRING, description: "For verbs: The grammatical time (e.g. 'Präteritum', 'Futur I')." },
  person: { type: Type.STRING, description: "For verbs: The grammatical person (e.g. '3. Pers. Sing.')." }
};

const analysisSchema = {
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
                ...wordProperties,
                subWords: {
                  type: Type.ARRAY,
                  description: "If this item is a multi-word phrase (e.g. 'se levantó'), list the individual words here with their own analysis.",
                  items: {
                    type: Type.OBJECT,
                    properties: wordProperties,
                    required: ["word", "type", "baseForm"]
                  }
                }
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

const getAI = () => {
    const sessionKey = getSessionApiKey();
    const envKey = process.env.API_KEY;
    const apiKey = sessionKey || envKey;
    if (!apiKey) {
        throw new Error("Kein API Key gefunden. Bitte geben Sie einen in den Einstellungen ein.");
    }
    return new GoogleGenAI({ apiKey });
}

export const analyzeImage = async (base64Image: string): Promise<PageAnalysisResult> => {
  const ai = getAI();
  const prompt = `
    Analyze the attached Spanish book page. You are an expert Spanish teacher.
    CRITICAL INSTRUCTIONS:
    1. COMPLETE TRANSCRIPTION: You MUST process EVERY SINGLE SENTENCE visible on the page.
    2. PHRASE BINDING & BREAKDOWN: 
       - If you find a phrase (idioms like "tener que", reflexive verbs like "se levantó", compound tenses like "ha comido"), combine them into a SINGLE 'word' object first.
       - IMPORTANT: For these combined phrases, you MUST also populate the 'subWords' array with the analysis of the individual words.
    3. DETAILED VERB ANALYSIS: 
       - For every verb, you MUST provide the 'baseForm' (Infinitive).
       - You MUST provide the 'tense' (Zeitform) and 'person' (Person) for verbs.
    4. LITERAL TRANSLATION: If a phrase's meaning differs from the literal words, provide the literal translation in 'literalTranslation'.
    5. Provide all results in German.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        systemInstruction: "You are a professional Spanish-to-German translator. Extract all text and provide deep linguistic analysis including grammar details and literal translations.",
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
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
        },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio data returned");
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      const outputNode = outputAudioContext.createGain();
      outputNode.connect(outputAudioContext.destination);
      const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
      const source = outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputNode);
      source.start();
  } catch (error) {
      console.error("TTS failed:", error);
      throw error;
  }
}

export const generateExampleSentence = async (word: string, category: string): Promise<{ sentence: string, translation: string }> => {
    const ai = getAI();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generiere einen einfachen spanischen Beispielsatz für das Wort "${word}" (${category}). 
            Antworte im JSON Format mit den Feldern "sentence" (Spanisch) und "translation" (Deutsch).`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        sentence: { type: Type.STRING },
                        translation: { type: Type.STRING }
                    },
                    required: ["sentence", "translation"]
                }
            }
        });
        const text = response.text;
        return JSON.parse(text || "{}");
    } catch (e) {
        console.error(e);
        return { sentence: "Fehler beim Generieren.", translation: "" };
    }
}