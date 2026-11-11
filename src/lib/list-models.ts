import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

async function listModels() {
  try {
    // Note: listModels() may not be available in all versions of the SDK
    // This is a development utility and should not run in production
    console.log("AVAILABLE MODELS: (Development utility - disabled in production build)");
  } catch (error) {
    console.error("Listing Models Error:", error);
  }
}

// Dev-only: Uncomment to list models locally
// listModels();
