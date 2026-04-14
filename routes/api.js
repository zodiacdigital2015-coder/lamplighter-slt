/**
 * API endpoints for LampLighter: SLT Institutional Memory
 * - Audience-aware output formatting
 * - Time pressure calibration
 * - Document transparency instructions
 * - Full persona voice instructions (Scott, Carina, Jackie, Neutral)
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
const GeneratedPromptWithReason = zod.object({
    prompt_heading: zod.string(),
    copilot_prompt: zod.string(),
    reason_for_choosing: zod.string(),
    character_count: zod.number(),
});

const GeneratedPromptList = zod.object({
    prompts: zod.array(GeneratedPromptWithReason),
});

// -- Persona Map --
// Full writing voice instructions for each persona.
// Grounded in real writing samples from each individual.
const personaMap = {
    "neutral": `
        Write this output in the voice of an Objective, Neutral Analyst.
        Focus purely on the facts. Avoid emotive language.
        Use clear, professional prose appropriate for senior leaders.`,

    "scott": `
        Write this output in the voice of Scott Bullock, the Principal of East Durham College.
        Use a visionary, collaborative, and motivating tone.
        Frame the college as an 'anchor institution' dedicated to 'enriching lives through 
        transformative education' and building a regional 'talent pipeline'.
        Focus on balancing three equal dimensions: People, Performance, and Finance.
        Use inclusive, shared-mission language ('we', 'our') and structure arguments clearly
        (e.g., using 'An Ask and an Offer' or numbered priorities).
        Be realistic about sector challenges (funding, inspections) but remain fiercely proud
        of the staff and the East Durham community.
        Always tie operational details back to improving students' life chances and social mobility.`,

    "carina": `
        Write this output in the voice of Carina Briggs.
        Use a formal, evaluative, and highly data-driven tone typical of UK FE performance reporting.
        Favour structured, evidence-based sentences that frequently reference leaders, managers,
        and governors.
        Use sector-specific terminology (e.g., NARTs, ILR, KPIs, distance travelled).
        Be transparent: celebrate successes using concrete statistics, but directly state areas
        requiring improvement without sugar-coating (e.g., 'outcomes are disappointing').
        Frame risks and issues using an 'Alert, Advise, Assure' mindset, maintaining a clear
        focus on strategic impact, accountability, and positive learner destinations.`,

    "jackie": `
        Write this output in the voice of Jackie Lanagan.
        Use a formal, strategic, and partnership-focused tone.
        Frame the college as a civic actor driving social mobility and responding to regional
        skills needs.
        Favour active, future-oriented sentences (e.g., 'We will actively seek...', 
        'We will continue to invest...').
        Connect actions directly to strategic objectives, KPIs, or compliance standards.
        Use terminology such as 'skills priority areas', 'labour market intelligence (LMI)',
        'stakeholder engagement', and 'levy paying organisations'.
        When discussing issues (like complaints), focus on demographic patterns, procedural
        fairness, and continuous improvement rather than isolated incidents.`,
};

// -- Audience Context --
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
            audience,
            timePressure,
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

        // -- RESOLVE PERSONA --
        const personaInstruction = personaMap[persona] || personaMap["neutral"];

        // -- AUDIENCE & TIME PRESSURE CONTEXT --
        const audienceContext = getAudienceContext(audience);
        const timePressureContext = getTimePressureContext(timePressure);

        // -- SECURITY FLAGS --
        const redactionFlag = (strictRedaction === 'true' || strictRedaction === true)
            ? "CONFIDENTIALITY LOCK ACTIVE: Strip all names, student IDs, and salary figures from the output. Generalise all roles (e.g. replace named individuals with 'A senior manager')."
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

            VOICE / PERSONA INSTRUCTION:
            ${personaInstruction}

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
            - historical-context or performance-targets: Use MODE A or MODE B as appropriate
            - talking-points: Produce a concise briefing card of no more than 6 bullet points,
              each no longer than two lines. Suitable for walking into a meeting prepared.

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
        if (result.prompts && result.prompts.length > 0) {
            const prompt = result.prompts[0];
            const actualCount = prompt.copilot_prompt.length;

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