// src/index.js
export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Only accept POST requests
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Method not allowed. Please use POST." 
      }), { 
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    try {
      // Parse the request body
      const body = await request.json();
      const { message, systemPrompt, temperature = 0.7, maxTokens = 1000 } = body;

      if (!message) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Message is required" 
        }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      // Log the request (for debugging)
      console.log(`Processing message: ${message.substring(0, 50)}...`);

      // Prepare the prompt with system context if provided
      let prompt = message;
      if (systemPrompt) {
        prompt = `${systemPrompt}\n\nUser: ${message}\n\nAssistant:`;
      } else {
        prompt = `User: ${message}\n\nAssistant:`;
      }

      // Check if AI binding exists
      if (!env.AI) {
        throw new Error("AI binding not configured. Please add [[ai]] binding to wrangler.toml");
      }

      // Call the AI model
      const response = await env.AI.run(
        "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        {
          prompt: prompt,
          max_tokens: maxTokens,
          temperature: temperature,
          top_p: 0.95,
        },
        {
          gateway: {
            id: "fly-ai-mini",
          },
        }
      );

      // Extract the response text
      let responseText = response.response || response.result || response;
      
      // If response is an object, stringify it
      if (typeof responseText === 'object') {
        responseText = JSON.stringify(responseText);
      }

      console.log(`AI Response: ${responseText.substring(0, 50)}...`);

      return new Response(JSON.stringify({ 
        success: true, 
        response: responseText,
        usage: response.usage || null
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      console.error("Error:", error);
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack // Useful for debugging
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  },
};