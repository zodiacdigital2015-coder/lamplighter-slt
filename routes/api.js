/**
 * API endpoints for Lamp Lighter: Quality Assurance Edition
 * - Handles "Strict Ofsted Mode" vs "General Quality Mode"
 * - Generates DUAL OUTPUTS (Copilot + ChatGPT)
 * - References Knowledge Base
 * - Handles Defaults
 * - ENFORCES SINGLE RESULT (Temperature 0.2)
 * - ADDS DEPTH REQUIREMENT (Cites specific evidence)
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai'); 
const zod = require('zod');
const { zodResponseFormat } = require("openai/helpers/zod");

// -- API Key Setup --
let openai_api_key = "";
const apiKeyPath = path.join(__dirname, '../../data/openai_api_key.txt');

if (fs.existsSync(apiKeyPath)) {
    try {
        openai_api_key = fs.readFileSync(apiKeyPath, 'utf8').trim();
    } catch (err) {
        console.error('Cannot read OpenAI API Key file.');
    }
} else if (process.env.OPENAI_API_KEY) {
    openai_api_key = process.env.OPENAI_API_KEY;
} else {
    console.error('No API Key found. The app will likely fail to generate.');
}

// -- Initialize OpenAI Client --
const openai = new OpenAI({
    apiKey: openai_api_key, 
});

const PRIMARY_MODEL = "gpt-4o"; 

// -- Zod Schema --
const GeneratedPromptWithReason = zod.object({
    prompt_heading: zod.string(),
    copilot_prompt: zod.string(),
    chatgpt_prompt: zod.string(),
    reason_for_choosing: zod.string(),
});

const GeneratedPromptList = zod.object({
    prompts: zod.array(GeneratedPromptWithReason),
});

/**
 * POST /api/generatePrompts
 */
router.post('/generatePrompts', async (req, res) => {
    try {
        let { 
            level,              
            subject,            
            unit,               
            learningOutcome,    
            activityCategory,   
            activityType,       
            topic               
        } = req.body;

        // -- DEFAULTS LOGIC --
        level = level || "General FE Provision";
        subject = subject || "Cross-College / All Departments";
        unit = unit || "General Quality Standards";
        learningOutcome = learningOutcome || "Analysis & Review";
        
        if (!topic || topic.trim() === "") {
            topic = "The user will provide specific evidence/documents in the next step.";
        }

        // 1. Determine "Mode"
        const isStrictOfstedMode = ["SAR", "QIP", "Inspection Prep", "Deep Dive"].includes(activityCategory);

        let systemInstruction = "";

        // 2. Select Persona
        if (isStrictOfstedMode) {
            systemInstruction = `
                You are an expert HMI (Her Majesty's Inspector) for Further Education.
                
                The user is performing a high-stakes quality task: ${activityCategory}.
                
                RULES:
                1. Use strict Education Inspection Framework (EIF) terminology.
                2. Be critical and evaluative.
                3. Audit evidence against Grade Descriptors.
                4. **CRITICAL:** Return EXACTLY ONE result object in the array. Do not generate multiple options.
                5. **DEPTH REQUIREMENT:** The generated prompt must instruct the next AI to CITE SPECIFIC EXAMPLES (quotes, data points) from the user's evidence to back up every claim. General summaries are not accepted.
            `;
        } else {
            systemInstruction = `
                You are a helpful Quality Assurance Manager.
                
                The user is performing a general quality task: ${activityCategory}.
                
                RULES:
                1. Use professional, supportive educational language.
                2. Focus on clarity and improvement.
                3. **CRITICAL:** Return EXACTLY ONE result object in the array. Do not generate multiple options.
            `;
        }

        // 3. User Context
        const userPrompt = `
            Generate a SINGLE prompt entry for:
            - Provision: ${level}
            - Area: ${subject}
            - Theme: ${unit}
            - Task: ${activityType}
            - Headline: "${learningOutcome}"
            
            EVIDENCE CONTEXT:
            "${topic}"

            INSTRUCTIONS:
            Generate a single JSON object containing two versions (Copilot and ChatGPT).
            
            IMPORTANT: Explicitly instruct the AI to cross-reference the user's evidence with its **Internal Knowledge Base** (uploaded EIF handbook/Strategy).

            1. "copilot_prompt": Optimized for Microsoft 365 Copilot (Internal/Secure).
               - Instruct it to "Look at the attached file" AND "Reference your uploaded knowledge base".
               - Must demand specific citations from the file.

            2. "chatgpt_prompt": Optimized for ChatGPT (External/Paste).
               - Instruct it to "Analyze the text pasted below" AND "Reference your uploaded knowledge base".
               - Must demand specific citations from the text.
            
            CONSTRAINT: The output array must contain ONLY ONE item. Do not provide variations.
        `;

        // 4. Call OpenAI
        const completion = await openai.chat.completions.create({
            model: PRIMARY_MODEL,
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: userPrompt }
            ],
            response_format: zodResponseFormat(GeneratedPromptList, "generated_prompt_list"),
            temperature: 0.2, // Low temp for strict adherence
        });

        // 5. Send result
        const result = JSON.parse(completion.choices[0].message.content);
        res.json(result);

    } catch (error) {
        console.error("OpenAI Error:", error);
        res.status(500).json({ 
            error: "Failed to generate prompt. Check server logs." 
        });
    }
});

module.exports = router;