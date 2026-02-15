/**
 * LampLighter: Institutional Memory (SLT Edition)
 * Server Entry Point - Stateless / Calibration Mode
 */

const path = require('path');
const express = require('express');
const app = express();

// Security Headers
const helmet = require('helmet');
app.use(helmet({ contentSecurityPolicy: false }));

// Setup View Engine
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Mock User for Stateless Demo (No Login Required)
app.use((req, res, next) => {
    req.user = { id: 1, email: 'SLT Admin', Admin: true };
    res.locals.currentUser = req.user; 
    next();
});

// Home Route
app.get('/', (req, res) => {
    res.render('home', { user: req.user });
});

// POST /generate
app.post('/generate', (req, res) => {
    try {
        const { 
            questionType, timeScope, topic, outputStyle, 
            stakeholderLens, docPriority, hasExternalDoc, persona,
            strictRedaction 
        } = req.body;

        const labels = {
            'strategic-alignment': 'Strategic Alignment',
            'historical-context': 'Historical Context',
            'risk-patterns': 'Risk Patterns',
            'commitment-tracking': 'Commitment Tracking',
            'evidence-impact': 'Evidence of Impact',
            
            '12-months': 'Last 12 Months',
            '2-years': 'Last 2 Years',
            '3-years': 'Last 3 Years',
            'all-records': 'All Records',

            'executive-summary': 'Executive Summary',
            'board-paper': 'Board Paper Narrative',
            'risk-register': 'Risk Matrix Format',
            'timeline': 'Chronological Timeline',
            'gap-analysis': 'Gap Analysis (Promise vs Reality)'
        };

// --- 1. PERSONA LOGIC ---
        const personas = {
            'neutral': "Adopt an **Objective, Neutral Analyst** tone. Focus purely on the facts. Avoid emotive language.",
            
            'carina': "Adopt the persona of **Carina Briggs**. Use a formal, evaluative, and highly data-driven tone typical of UK FE performance reporting. Favour structured, evidence-based sentences that frequently reference leaders, managers, and governors. Use sector-specific terminology (e.g., NARTs, ILR, KPIs, distance travelled). Be transparent: celebrate successes using concrete statistics, but directly state areas requiring improvement without sugar-coating (e.g., 'outcomes are disappointing'). Frame risks and issues using an 'Alert, Advise, Assure' mindset, maintaining a clear focus on strategic impact, accountability, and positive learner destinations."
        };

        const personaInstruction = personas[persona] || personas['neutral'];

        // --- 2. CONFIDENTIALITY LOGIC ---
        let confidentialityClause = "";
        if (strictRedaction) {
            confidentialityClause = `
### 🔒 CONFIDENTIALITY LOCK ACTIVE
**STRICT REDACTION REQUIRED:**
- Do NOT output the names of any staff members or students.
- Do NOT output specific salary figures or precise payroll costs.
- Generalise all roles (e.g., replace "John Smith" with "A senior manager").
- If a document is marked "Confidential", summarise the findings without quoting sensitive data directly.
            `.trim();
        }

        // --- 3. DOCUMENT PRIORITY LOGIC ---
        let priorityInstruction = "";
        if (docPriority === 'Approved') {
            // The "Approved Only" Rule
            priorityInstruction = "Strictly ignore any documents labeled 'Draft', 'Provisional', or 'Working Copy'. Base analysis ONLY on finalized minutes and published reports.";
        } else {
            // The Standard Rule
            priorityInstruction = `Give extra weight to **${docPriority}** type documents.`;
        }

        let prompt = "";

        // === MODE 1: CROSS-REFERENCE (External Doc) ===
        if (hasExternalDoc) {
             prompt = `
### ROLE: STRATEGIC ANALYST (CROSS-REFERENCE MODE)
You are analysing an **External Document** (attached to this chat) in the context of our **Internal Knowledge Base**.

${confidentialityClause}

### INPUT CONTEXT
- **External Source:** User uploaded document (e.g. White Paper/Report).
- **Internal Context:** Secure College Document Corpus.
- **Specific Topic:** ${topic}
- **Strategic Lens:** ${labels[questionType] || questionType}
- **Stakeholder Perspective:** ${stakeholderLens}

### INSTRUCTIONS
1. **Analyse External:** Summarise the key proposals, risks, or changes in the attached document related to "**${topic}**".
2. **Cross-Reference Internal:** Immediately search the internal corpus (SARs, Board Papers, Strategic Plan) for conflicts or alignment.
3. **Synthesise:** Report the findings using the **${labels[outputStyle] || outputStyle}** format.

### TONE & PERSONA INSTRUCTION
**${personaInstruction}**
            `.trim();

        } 
        // === MODE 2: STANDARD RECALL (Internal Only) ===
        else {
            prompt = `
### ROLE: INSTITUTIONAL MEMORY ANALYST
You are an expert analyst for the Senior Leadership Team.

${confidentialityClause}

### QUERY PARAMETERS
- **Topic:** ${topic}
- **Strategic Lens:** ${labels[questionType] || questionType}
- **Stakeholder Perspective:** ${stakeholderLens}
- **Time Horizon:** ${labels[timeScope] || timeScope}
- **Document Priority:** ${docPriority}

### ANALYSIS INSTRUCTIONS
1. **Search:** Scan documents within the **${labels[timeScope]}** timeframe.
2. **Prioritise:** ${priorityInstruction}
3. **Perspective:** Analyse implications for **${stakeholderLens}**.
4. **Synthesise:** Connect the topic to strategic goals and cite sources.

### TONE & PERSONA INSTRUCTION
**${personaInstruction}**

### OUTPUT FORMAT
Provide a **${labels[outputStyle] || outputStyle}**.
            `.trim();
        }

        res.json({ result: prompt });

    } catch (error) {
        console.error("Generation Error:", error);
        res.status(500).json({ error: "Failed to generate prompt." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✔ LampLighter: SLT Edition running on port ${PORT}`);
});

module.exports = app;