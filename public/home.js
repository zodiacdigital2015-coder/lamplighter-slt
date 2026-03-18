document.addEventListener('DOMContentLoaded', function() {
    
    // 1. Get Elements
    const generateBtn = document.getElementById('generate-button');
    const topicInput = document.getElementById('topic');
    const loader = document.getElementById('recipe-loader');
    
    // 2. Add Click Listener
    generateBtn.addEventListener('click', async function() {
        
        // Validation
        if (!topicInput.value.trim()) {
            alert("Please enter a Topic or Line of Enquiry.");
            return;
        }

        // Show Loading State
        generateBtn.disabled = true;
        loader.classList.remove('hidden');
        
        // 3. Gather Data — includes all form fields including new audience and timePressure
        const payload = {
            questionType: document.getElementById('questionType').value,
            stakeholderLens: document.getElementById('stakeholderLens').value,
            timeScope: document.getElementById('timeScope').value,
            docPriority: document.getElementById('docPriority').value,
            topic: document.getElementById('topic').value,
            outputStyle: document.getElementById('outputStyle').value,
            persona: document.getElementById('persona').value,
            hasExternalDoc: document.getElementById('hasExternalDoc').checked,
            strictRedaction: document.getElementById('strictRedaction').checked,

            // NEW: Audience and time pressure
            audience: document.getElementById('audience').value,
            timePressure: document.getElementById('timePressure').value,
        };

        try {
            // 4. Send to API endpoint
            const response = await fetch('/api/generatePrompts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.error) {
                alert("Error: " + data.error);
            } else if (data.prompts && data.prompts.length > 0) {
                showResult(data.prompts[0]);
            } else {
                alert("No prompt was returned. Please try again.");
            }

        } catch (err) {
            console.error(err);
            alert("Something went wrong connecting to the server.");
        } finally {
            generateBtn.disabled = false;
            loader.classList.add('hidden');
        }
    });

    // 5. Display the generated prompt and handle character limit warning
    function showResult(promptData) {
        const container = document.getElementById('response-container-1');
        const textBox = document.getElementById('copilot-text-1');
        const copyBtn = document.getElementById('copy-copilot-1');
        const charWarning = document.getElementById('char-warning-1');
        const charCount = document.getElementById('char-count-1');

        // Populate the prompt text
        textBox.textContent = promptData.copilot_prompt;

        // Show or hide the character limit warning
        if (promptData.over_limit === true) {
            charCount.textContent = promptData.character_count;
            charWarning.style.display = 'block';
        } else {
            charWarning.style.display = 'none';
        }

        // Show the container and scroll to it
        container.classList.remove('hidden');
        container.scrollIntoView({ behavior: 'smooth' });

        // Copy button behaviour
        copyBtn.onclick = function() {
            navigator.clipboard.writeText(promptData.copilot_prompt);
            const originalText = copyBtn.textContent;
            copyBtn.textContent = "Copied!";
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        };
    }
});