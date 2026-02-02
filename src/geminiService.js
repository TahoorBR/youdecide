import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;
let model = null;

// Get API key from environment variable
const ENV_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Initialize Gemini with API key
export function initializeGemini(apiKey) {
  const key = apiKey || ENV_API_KEY;
  if (!key) {
    throw new Error('API key is required');
  }
  genAI = new GoogleGenerativeAI(key);
  model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  return true;
}

// Auto-initialize if env key exists
export function autoInitialize() {
  if (ENV_API_KEY && !model) {
    try {
      initializeGemini(ENV_API_KEY);
      return true;
    } catch (e) {
      console.error('Failed to auto-initialize Gemini:', e);
      return false;
    }
  }
  return isGeminiInitialized();
}

// Check if Gemini is initialized
export function isGeminiInitialized() {
  return model !== null;
}

// Check if env API key exists
export function hasEnvApiKey() {
  return !!ENV_API_KEY;
}

// Make AI-powered decision
export async function makeAIDecision(options, constraints, energy, mood) {
  if (!model) {
    throw new Error('Gemini not initialized. Please add your API key.');
  }

  const optionsList = Array.isArray(options) 
    ? options 
    : options.split(/[,\n]/).map(o => o.trim()).filter(Boolean);

  if (optionsList.length === 0) {
    return {
      decision: null,
      reasoning: "Please provide at least one option to choose from.",
      confidence: 0,
    };
  }

  if (optionsList.length === 1) {
    return {
      decision: optionsList[0],
      reasoning: "Only one option provided - that makes this easy! Go with it.",
      confidence: 100,
    };
  }

  const prompt = `You are a decision-making assistant. Your job is to help someone who is tired of making decisions.

The user needs help choosing between these options:
${optionsList.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}

Context:
- Energy level: ${energy} (exhausted/tired/neutral/good/energized)
- Current mood: ${mood} (stressed/anxious/neutral/happy/excited)
${constraints ? `- Constraints/preferences: ${constraints}` : '- No specific constraints'}

Instructions:
1. Pick ONE option that best fits their current state
2. Be decisive - don't hedge or say "it depends"
3. Keep reasoning to 2-3 short sentences max
4. Be warm and reassuring - they're feeling decision fatigue
5. Match your tone to their energy (if tired, be gentle; if energized, be enthusiastic)

Respond ONLY in this exact JSON format (no markdown, no code blocks):
{"decision": "exact option text", "reasoning": "2-3 sentence explanation", "confidence": 85}

The confidence should be 60-95 based on how clear the choice is given their context.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // Parse the JSON response
    // Remove any potential markdown code blocks
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      const parsed = JSON.parse(cleanText);
      
      // Validate the response
      if (!parsed.decision || !parsed.reasoning) {
        throw new Error('Invalid response format');
      }

      // Make sure the decision is one of the options (fuzzy match)
      const matchedOption = optionsList.find(opt => 
        opt.toLowerCase().includes(parsed.decision.toLowerCase()) ||
        parsed.decision.toLowerCase().includes(opt.toLowerCase())
      ) || parsed.decision;

      return {
        decision: matchedOption,
        reasoning: parsed.reasoning,
        confidence: Math.min(95, Math.max(60, parsed.confidence || 75)),
      };
    } catch (parseError) {
      console.error('Failed to parse AI response:', text);
      // Fallback: try to extract decision from text
      const firstOption = optionsList[0];
      return {
        decision: firstOption,
        reasoning: "I've picked this option based on your current state. Trust the choice and move forward!",
        confidence: 70,
      };
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error(error.message || 'Failed to get AI response. Please try again.');
  }
}

// Get API key from localStorage
export function getStoredApiKey() {
  return localStorage.getItem('gemini_api_key') || '';
}

// Store API key in localStorage
export function storeApiKey(apiKey) {
  localStorage.setItem('gemini_api_key', apiKey);
}

// Remove API key from localStorage
export function removeApiKey() {
  localStorage.removeItem('gemini_api_key');
  genAI = null;
  model = null;
}
