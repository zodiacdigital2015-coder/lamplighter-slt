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
        
        // 3. Gather Data (NOW INCLUDES REDACTION)
        const payload = {
            questionType: document.getElementById('questionType').value,
            stakeholderLens: document.getElementById('stakeholderLens').value,
            timeScope: document.getElementById('timeScope').value,
            docPriority: document.getElementById('docPriority').value,
            topic: document.getElementById('topic').value,
            outputStyle: document.getElementById('outputStyle').value,
            persona: document.getElementById('persona').value,
            
            // Toggles
            hasExternalDoc: document.getElementById('hasExternalDoc').checked,
            strictRedaction: document.getElementById('strictRedaction').checked
        };

        try {
            // 4. Send to Server
            const response = await fetch('/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.error) {
                alert("Error: " + data.error);
            } else {
                showResult(data.result);
            }

        } catch (err) {
            console.error(err);
            alert("Something went wrong connecting to the server.");
        } finally {
            generateBtn.disabled = false;
            loader.classList.add('hidden');
        }
    });

    // Helper Function to Display Output
    function showResult(text) {
        const container = document.getElementById('response-container-1');
        const textBox = document.getElementById('copilot-text-1');
        const copyBtn = document.getElementById('copy-copilot-1');

        textBox.textContent = text;
        container.classList.remove('hidden');
        container.scrollIntoView({ behavior: 'smooth' });

        copyBtn.onclick = function() {
            navigator.clipboard.writeText(text);
            const originalText = copyBtn.textContent;
            copyBtn.textContent = "Copied!";
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        };
    }
});