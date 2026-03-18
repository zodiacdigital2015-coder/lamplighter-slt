/**
 * API endpoints for LampLighter: SLT Institutional Memory
 * - Audience-aware output formatting
 * - Time pressure calibration
 * - Document transparency instructions
 * - 1900 character prompt limit with user warning
 * - Single Copilot output only
 * - Temperature 0.2 for consistency
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
// Single Copilot prompt only, with a character_count field for validation
const GeneratedPromptWithReason = zod.object({
    prompt_heading: zod.string(),
    copilot_prompt: zod.string(),
    reason_for_choosing: zod.string(),
    character_count: zod.number(),
});

const GeneratedPromptList = zod.object({
    prompts: zod.array(GeneratedPromptWithReason),
});

// -- Audience Context --
// Returns formatting and tone instructions based on intended audience
// This ensures the generated prompt instructs Copilot to produce
// output in the right format for where it will actually be used
function getAudienceContext(audience) {
    const contexts = {
        "Internal SLT use only": `
            AUDIENCE: Internal SLT use only.
            Format the output as a concise briefing note for senior leaders.
            Plain English, direct, no need for formal report structure.
            Bullet points and short paragraphs preferred.`,

        "Board paper / Governor briefing": `
            AUDIENCE: Board paper or Governor briefing.
            Format the output using formal board paper structure:
            1. Context / Background
            2. Key Findings (with evidence citations)
            3. Risks and Mitigations
            4. Recommended Actions
            Use formal language appropriate for a governance audience.
            Governors may not have operational FE knowledge — explain acronyms.`,

        "Ofsted preparation": `
            AUDIENCE: Ofsted preparation.
            Format the output as an inspection briefing.
            Use strict EIF terminology throughout.
            Structure around the four judgement areas where relevant:
            Quality of Education, Behaviour and Attitudes,
            Personal Development, Leadership and Management.
            Be evaluative and evidence-based — inspectors will challenge vague claims.`,

        "External stakeholder / Partner": `
            AUDIENCE: External stakeholder or partner.
            Use professional but accessible language — avoid internal jargon.
            Focus on outcomes, impact, and strategic intent.
            Do not reference internal processes or governance structures in detail.
            Suitable for sharing with employers, local authorities, or funding bodies.`,
    };

    return contexts[audience] || `
            AUDIENCE: General SLT use.
            Use clear professional language appropriate for senior leaders.`;
}

// -- Time Pressure Context --
// Adjusts the urgency and focus of the generated prompt
function getTimePressureContext(timePressure) {
    const contexts = {
        "Routine / No immediate deadline": `
            TIME CONTEXT: Routine enquiry with no immediate deadline.
            Take a thorough, reflective approach. 
            Depth and completeness are more important than brevity.`,

        "Within the next month": `
            TIME CONTEXT: Output needed within the next month.
            Balance thoroughness with practicality.
            Flag any areas that need further evidence gathering before the deadline.`,

        "Within the next two weeks": `
            TIME CONTEXT: Output needed within two weeks.
            Prioritise the most critical findings.
            Clearly flag any gaps in evidence that cannot be resolved in time.`,

        "Ofsted visit imminent (within 48 hours)": `
            TIME CONTEXT: OFSTED VISIT IMMINENT — within 48 hours.
            This is high-stakes. Be direct and forensic.
            Lead with the strongest evidence of impact.
            Identify any vulnerabilities that inspectors are likely to probe.
            Do not soften findings — leaders need the unvarnished picture right now.`,
    };

    return contexts[timePressure] || `
            TIME CONTEXT: No specific time pressure indicated.`;
}

/**
 * POST /api/generatePrompts
 */
router.post('/generatePrompts', async (req, res) => {
    try {
        let {
            questionType,
            stakeholderLens,
            timeScope,
            docPriority,
            topic,
            outputStyle,
            persona,
            hasExternalDoc,
            strictRedaction,
            audience,        // NEW
            timePressure,    // NEW
        } = req.body;

        // -- DEFAULTS --
        questionType = questionType || "strategic-alignment";
        stakeholderLens = stakeholderLens || "General";
        timeScope = timeScope || "all-records";
        docPriority = docPriority || "Balanced";
        outputStyle = outputStyle || "executive-summary";
        persona = persona || "neutral";
        audience = audience || "Internal SLT use only";
        timePressure = timePressure || "Routine / No immediate deadline";

        if (!topic || topic.trim() === "") {
            topic = "The user will provide the specific line of enquiry verbally in Copilot.";
        }

        // -- AUDIENCE & TIME PRESSURE CONTEXT --
        const audienceContext = getAudienceContext(audience);
        const timePressureContext = getTimePressureContext(timePressure);

        // -- PERSONA INSTRUCTION --
        // Maps the dropdown value to the full persona name for the prompt
        const personaMap = {
            "neutral": "Objective / Neutral Analyst",
            "scott": "Scott Bullock (Principal)",
            "carina": "Carina Briggs",
            "jackie": "Jackie Lanagan",
        };
        const personaLabel = personaMap[persona] || "Objective / Neutral Analyst";

        // -- SECURITY FLAGS --
        const redactionFlag = (strictRedaction === 'true' || strictRedaction === true)
            ? "CONFIDENTIALITY LOCK ACTIVE"
            : "";

        const draftFilterFlag = (docPriority === 'Approved')
            ? "Strictly ignore any documents labeled 'Draft', 'v0.x', 'Provisional', or 'Working Copy'."
            : "";

        const externalDocFlag = (hasExternalDoc === 'true' || hasExternalDoc === true)
            ? "The user will attach an external PDF document. Treat this as Mode C: External Cross-Reference. Summarise the external document's threat or opportunity in no more than five bullet points, then scan the internal corpus for the college's current position, and produce a Readiness Rating: Strong / Partial / Insufficient / Unknown — with evidence for the rating."
            : "";

        // -- SYSTEM INSTRUCTION --
        const systemInstruction = `
            You are a prompt engineer specialising in UK Further Education leadership.
            
            Your task is to generate a single, high-quality prompt for the LampLighter 
            SLT Institutional Memory Copilot Agent.

            The generated prompt will be pasted directly into Microsoft 365 Copilot 
            by a senior leader at an FE college. It must be immediately usable — 
            clear, precise, and professionally worded.

            CRITICAL CONSTRAINT: The generated copilot_prompt must not exceed 1900 
            characters. This is a hard limit imposed by Microsoft Copilot. If the 
            prompt cannot fit within 1900 characters, prioritise: security flags first, 
            then audience and time pressure context, then analytical instructions, 
            then formatting preferences. Never truncate mid-sentence.

            CHARACTER COUNT: After generating the copilot_prompt, count the characters 
            and return the exact count in the character_count field.

            Return EXACTLY ONE result object in the prompts array.
        `;

        // -- USER PROMPT --
        const userPrompt = `
            Generate a single Copilot prompt for the LampLighter SLT Agent with these parameters:

            ENQUIRY DETAILS:
            - Strategic Lens: ${questionType}
            - Stakeholder Perspective: ${stakeholderLens}
            - Time Horizon: ${timeScope}
            - Document Priority: ${docPriority}
            - Topic / Line of Enquiry: "${topic}"
            - Desired Output Format: ${outputStyle}
            - Voice / Persona: ${personaLabel}

            AUDIENCE & URGENCY:
            ${audienceContext}
            ${timePressureContext}

            SECURITY FLAGS (include verbatim at the top of the prompt if present):
            ${redactionFlag}
            ${draftFilterFlag}

            EXTERNAL DOCUMENT MODE:
            ${externalDocFlag || "No external document — use internal knowledge base only."}

            DOCUMENT TRANSPARENCY INSTRUCTION (always include this):
            The prompt must instruct Copilot to:
            1. Begin every response by listing the documents it is drawing from, 
               e.g. "Sources used: [Strategic Plan 2023-26, Board Minutes Oct 2024, QIP Nov 2024]"
            2. If a document relevant to this enquiry appears to be missing from the 
               knowledge base, explicitly tell the user which document type is needed 
               and where it would typically be found.

            ANALYTICAL MODE:
            Based on the strategic lens "${questionType}", apply the most appropriate mode:
            - strategic-alignment or commitment-tracking: Use MODE A (Gap Analysis)
            - risk-patterns: Use MODE B (Risk Pattern Recognition)  
            - historical-context or evidence-impact: Use MODE A or MODE B as appropriate

            FORMAT REMINDER: The final copilot_prompt must be under 1900 characters.
            Count carefully and return the character count in the character_count field.
        `;

        // -- CALL OPENAI --
        const completion = await openai.chat.completions.create({
            model: PRIMARY_MODEL,
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: userPrompt }
            ],
            response_format: zodResponseFormat(GeneratedPromptList, "generated_prompt_list"),
            temperature: 0.2,
        });

        // -- PARSE RESULT --
        const result = JSON.parse(completion.choices[0].message.content);

        // -- SERVER-SIDE CHARACTER COUNT CHECK --
        // GPT-4o counts characters itself, but we verify server-side as a safety net
        if (result.prompts && result.prompts.length > 0) {
            const prompt = result.prompts[0];
            const actualCount = prompt.copilot_prompt.length;
            
            // If over limit, flag it — don't silently truncate
            if (actualCount > 1900) {
                prompt.character_count = actualCount;
                prompt.over_limit = true;
            } else {
                prompt.character_count = actualCount;
                prompt.over_limit = false;
            }
        }

        res.json(result);

    } catch (error) {
        console.error("OpenAI Error:", error);
        res.status(500).json({
            error: "Failed to generate prompt. Check server logs."
        });
    }
});

module.exports = router;