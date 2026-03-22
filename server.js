require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenAI, Type } = require('@google/genai');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS so the frontend can communicate with the backend
app.use(cors());

// Parse JSON bodies with an increased limit for base64 images
app.use(express.json({ limit: '50mb' }));

app.post('/api/analyze', async (req, res) => {
    try {
        const { image } = req.body;
        
        if (!image) {
            return res.status(400).json({ error: 'Image data is required' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
            console.error("No API key configured");
            return res.status(500).json({ error: "Server API Key not configured" });
        }

        console.log(`Analyzing image (Size: ${Math.round(image.length / 1024)} KB)`);
        const ai = new GoogleGenAI({ apiKey: apiKey });
        
        // Detect MIME type and extract pure base64 data
        let mimeType = "image/jpeg";
        let dataPart = image;
        
        if (image.includes(';base64,')) {
            const parts = image.split(';base64,');
            mimeType = parts[0].split(':')[1] || "image/jpeg";
            dataPart = parts[1];
        } else if (image.includes(',')) {
            dataPart = image.split(",")[1];
        }

        console.log(`Sending request to Gemini (MIME: ${mimeType})...`);
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
                parts: [
                    { inlineData: { mimeType: mimeType, data: dataPart } },
                    { 
                        text: "Act as an expert botanist and agronomist. Analyze this plant image. \n" +
                              "1. Identify the specific plant species (common and scientific name).\n" +
                              "2. Provide the recommended NPK (Nitrogen, Phosphorus, Potassium) ratio for optimal growth during its current or typical vegetative state. \n" +
                              "3. Return the N, P, and K values as standard integer or decimal strings (e.g., '10', '5.5'). \n" +
                              "4. In the 'n_rec' field, return ONLY the numerical value in grams (e.g., '15' or '20.5') of how much nitrogen nutrients this specific plant needs for optimal growth. DO NOT include the word 'grams' or any other text.\n" +
                              "Return the result EXCLUSIVELY in JSON format."
                    }
                ]
            }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        species: { type: Type.STRING },
                        n: { type: Type.STRING },
                        p: { type: Type.STRING },
                        k: { type: Type.STRING },
                        n_rec: { type: Type.STRING },
                    },
                    required: ["species", "n", "p", "k", "n_rec"],
                },
            },
        });

        console.log("Received response from Gemini");
        
        let resultText = response.text || "";
        if (!resultText && response.candidates && response.candidates[0]?.content?.parts?.[0]?.text) {
            resultText = response.candidates[0].content.parts[0].text;
        }

        console.log("Gemini Raw Result:", resultText);
        const result = JSON.parse(resultText || "{}");
        
        res.json({
            species: result.species || "Unknown Species",
            n: result.n || "-",
            p: result.p || "-",
            k: result.k || "-",
            n_rec: result.n_rec || "-"
        });

    } catch (error) {
        console.error("Backend Error Detail:", error);
        let errorMsg = error.message || "Detection Failed";
        
        // Check for common Gemini issues
        if (errorMsg.includes("429")) errorMsg = "API Rate Limit Exceeded";
        if (errorMsg.includes("400")) errorMsg = "Invalid Image or Request Format";
        if (errorMsg.includes("Safety")) errorMsg = "Image blocked by safety filters";

        res.status(500).json({ error: errorMsg });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`Backend API ready at http://localhost:${port}/api/analyze`);
});
