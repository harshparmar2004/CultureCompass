import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { currentLocation, timeAvailable, budgetAvailable, travelingWith } = req.body;

    if (!currentLocation || !timeAvailable || !budgetAvailable || !travelingWith) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const prompt = `You are a professional travel expert. Generate a smart day plan for a user in ${currentLocation}.
User constraints:
- Time available: ${timeAvailable}
- Budget: ${budgetAvailable}
- Traveling with: ${travelingWith}

Optimize the schedule to make the best use of their time and budget. Include engaging local spots, meals, and cultural experiences.

You MUST return a valid JSON object matching this schema:
{
  "type": "object",
  "properties": {
    "plan": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "time": { "type": "string", "description": "e.g., 9:00 AM" },
          "activity": { "type": "string", "description": "e.g., Breakfast at Local Cafe" },
          "description": { "type": "string", "description": "Brief description of the activity" }
        },
        "required": ["time", "activity", "description"]
      }
    }
  },
  "required": ["plan"]
}

Do not return markdown, only the raw JSON object.`;

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      throw new Error("GROQ_API_KEY environment variable is missing.");
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content;

    if (!text) throw new Error("No response from AI");

    return res.status(200).json(JSON.parse(text));
  } catch (error: any) {
    console.error("Error generating day plan:", error);
    return res.status(500).json({ error: "Failed to generate day plan" });
  }
}
