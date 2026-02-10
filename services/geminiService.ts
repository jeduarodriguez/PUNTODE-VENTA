
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateProductDetails = async (prompt: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Sugiere un producto para una cafetería/restaurante basado en esto: "${prompt}". 
      Devuelve los detalles en formato JSON con nombre, categoría, precio de venta (price), precio de compra/costo (costPrice), stock inicial sugerido y una descripción corta. El precio de venta debe ser mayor al de compra.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: { type: Type.STRING },
            price: { type: Type.NUMBER },
            costPrice: { type: Type.NUMBER },
            stock: { type: Type.NUMBER },
            description: { type: Type.STRING }
          },
          required: ["name", "category", "price", "costPrice", "stock", "description"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error generating product details:", error);
    return null;
  }
};
