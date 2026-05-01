/**
 * homeGenerators.js
 * LampLighter SLT Institutional Memory Tool
 * 
 * Note: Core prompt generation and display is handled by home.js.
 * This file is retained for future use as the tool develops.
 */

async function generatePrompts() {

    const questionType = document.getElementById('questionType')?.value || '';
    const stakeholderLens = document.getElementById('stakeholderLens')?.value || 'General';
    const timeScope = document.getElementById('timeScope')?.value || 'all-records';
    const docPriority = document.getElementById('docPriority')?.value || 'Balanced';
    const topic = document.getElementById('topic')?.value || '';
    const outputStyle = document.getElementById('outputStyle')?.value || 'executive-summary';
    const persona = document.getElementById('persona')?.value || 'neutral';
    const hasExternalDoc = document.getElementById('hasExternalDoc')?.checked || false;
    const strictRedaction = document.getElementById('strictRedaction')?.checked || false;
    const audience = document.getElementById('audience')?.value || 'Internal SLT use only';
    const timePressure = document.getElementById('timePressure')?.value || 'Routine / No immediate deadline';

    if (!topic || topic.trim() === '') {
        showToast('Please enter a topic or line of enquiry before generating.');
        return;
    }

    try {
        const response = await fetch('/api/generatePrompts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
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
            })
        });

        const data = await response.json();

        if (data.error) {
            showToast(data.error);
        }

    } catch (err) {
        console.error('Error calling /api/generatePrompts', err);
        showToast('Something went wrong connecting to the server.');
    }
}