
import { GoogleGenAI, Type } from "@google/genai";
import { MetalAnalysis } from "../types";

export const analyzeMetalFromImage = async (base64Image: string): Promise<MetalAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image
          }
        },
        {
          text: "Analyze the object in this image. Is it made of metal? If so, what type? Provide a detailed breakdown including magnetic likelihood."
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          detected: { type: Type.BOOLEAN },
          type: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          properties: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          description: { type: Type.STRING },
          magneticLikelihood: { 
            type: Type.STRING,
            description: "Options: High, Medium, Low, None"
          }
        },
        required: ["detected", "type", "confidence", "properties", "description", "magneticLikelihood"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    return data as MetalAnalysis;
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    throw new Error("Analysis failed");
  }
};
