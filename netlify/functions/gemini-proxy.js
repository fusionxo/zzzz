// This is your new, secure serverless function.
// It runs on Netlify's servers, not in the browser.

exports.handler = async function(event) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Get the prompt and image data from the frontend request
        const { prompt, base64Image, type } = JSON.parse(event.body);

        // --- Key Rotation & Failover Logic ---
        // Get your API keys securely from Netlify Environment Variables
        const apiKeys = {
            analyzer: [process.env.ANALYZER_GEM_1, process.env.ANALYZER_GEM_2, process.env.ANALYZER_GEM_3],
            dashboard: [process.env.DASHBOARD_GEM_1, process.env.DASHBOARD_GEM_2, process.env.DASHBOARD_GEM_3],
            food: [process.env.FOOD_GEM_1, process.env.FOOD_GEM_2, process.env.FOOD_GEM_3],
            tools: [process.env.TOOLS_GEM_1, process.env.TOOLS_GEM_2, process.env.TOOLS_GEM_3],
        };

        const keysForType = (apiKeys[type] || apiKeys.dashboard).filter(Boolean); // Default to dashboard keys

        if (keysForType.length === 0) {
            throw new Error('No API keys configured on the server for this function type.');
        }

        // --- Construct the payload for the real Gemini API ---
        const geminiApiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent";
        
        const requestBody = {
            contents: [{
                parts: [{ text: prompt }]
            }],
        };

        // If an image is sent from the frontend, add it to the payload
        if (base64Image) {
            requestBody.contents[0].parts.push({
                inline_data: {
                    mime_type: "image/jpeg",
                    data: base64Image
                }
            });
        }
        
        // --- Try keys until one succeeds ---
        let response;
        let lastError;

        for (const apiKey of keysForType) {
            try {
                const fetch = (await import('node-fetch')).default;
                response = await fetch(`${geminiApiUrl}?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });

                if (response.ok) {
                    const data = await response.json();
                    // Success! Return the data to the frontend.
                    return {
                        statusCode: 200,
                        body: JSON.stringify(data)
                    };
                }
                // If the key is bad, it will throw an error or have a non-ok status,
                // and the loop will try the next key.
                lastError = `API Error with status: ${response.status}`;

            } catch (error) {
                lastError = error.message;
                continue; // Try the next key
            }
        }

        // If all keys failed
        throw new Error(`All API attempts failed. Last error: ${lastError}`);

    } catch (error) {
        console.error('Proxy Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: { message: error.message } })
        };
    }
};
