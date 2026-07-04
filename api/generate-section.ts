import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { 
      currentLocation, age, tripType, duration, 
      budget, foodPreference, religion, adventureLevel, walkingPreference, languages, interests,
      section, isRegenerate 
    } = req.body;

    if (!currentLocation || !age || !tripType || !duration || !section) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let sectionPrompt = "";
    let sectionSchema: any;

    switch (section) {
      case "overview":
        sectionPrompt = isRegenerate 
          ? "- overview: A 100-word intro to the destination: vibe, best time to visit, one-line cultural identity. Provide alternative phrasing and vibe."
          : "- overview: A 100-word intro to the destination: vibe, best time to visit, one-line cultural identity.";
        sectionSchema = { type: "object", properties: { overview: { type: "string" } }, required: ["overview"] };
        break;
      case "attractions":
        sectionPrompt = isRegenerate
          ? "- attractions: 5-6 different must-see attractions than before. Each with name, 2-line description, estimated visit duration, and a relevance tag matching the traveler's profile."
          : "- attractions: 5-6 must-see attractions. Each with name, 2-line description, estimated visit duration, and a relevance tag matching the traveler's profile.";
        sectionSchema = {
          type: "object",
          properties: {
            attractions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  duration: { type: "string" },
                  relevanceTag: { type: "string" },
                },
                required: ["name", "description", "duration", "relevanceTag"],
              },
            },
          },
          required: ["attractions"],
        };
        break;
      case "hiddenGems":
        sectionPrompt = isRegenerate
          ? "- hiddenGems: 3-4 different lesser-known local spots with why they're special and a local tip line for each."
          : "- hiddenGems: 3-4 lesser-known local spots with why they're special and a local tip line for each.";
        sectionSchema = {
          type: "object",
          properties: {
            hiddenGems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  whySpecial: { type: "string" },
                  localTip: { type: "string" },
                },
                required: ["name", "whySpecial", "localTip"],
              },
            },
          },
          required: ["hiddenGems"],
        };
        break;
      case "storytelling":
        sectionPrompt = isRegenerate
          ? "- storytelling: An alternative immersive 150-200 word narrative about the destination's history/culture. Focus on a different folklore/legend snippet."
          : "- storytelling: An immersive 150-200 word narrative about the destination's history/culture, written engagingly (not textbook style). Include one folklore/legend snippet if relevant.";
        sectionSchema = { type: "object", properties: { storytelling: { type: "string" } }, required: ["storytelling"] };
        break;
      case "events":
        sectionPrompt = isRegenerate
          ? "- events: 3 alternative seasonal festivals/events or heritage experiences with description and best-time-to-attend note."
          : "- events: 3 seasonal festivals/events or heritage experiences with description and best-time-to-attend note.";
        sectionSchema = {
          type: "object",
          properties: {
            events: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  bestTimeToAttend: { type: "string" },
                },
                required: ["name", "description", "bestTimeToAttend"],
              },
            },
          },
          required: ["events"],
        };
        break;
      case "itinerary":
        sectionPrompt = isRegenerate
          ? `- itinerary: A completely different day-by-day itinerary matching a ${duration}-day trip.`
          : `- itinerary: A full day-by-day itinerary for a ${duration}-day trip, splitting attractions/hidden gems/events across days logically. Each day has an array of strings for morning, afternoon, and evening.`;
        sectionSchema = {
          type: "object",
          properties: {
            itinerary: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "integer" },
                  morning: { type: "array", items: { type: "string" } },
                  afternoon: { type: "array", items: { type: "string" } },
                  evening: { type: "array", items: { type: "string" } },
                },
                required: ["day", "morning", "afternoon", "evening"],
              },
            },
          },
          required: ["itinerary"],
        };
        break;
      case "connectLocally":
        sectionPrompt = isRegenerate
          ? "- connectLocally: 3-4 different authentic experience suggestions (home-cooked meal with a family, artisan workshop, guided heritage walk, local market tour) with description and why it's meaningful."
          : "- connectLocally: 3-4 authentic experience suggestions (home-cooked meal with a family, artisan workshop, guided heritage walk, local market tour) with description and why it's meaningful.";
        sectionSchema = {
          type: "object",
          properties: {
            connectLocally: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  meaningfulReason: { type: "string" },
                },
                required: ["name", "description", "meaningfulReason"],
              },
            },
          },
          required: ["connectLocally"],
        };
        break;
      default:
        return res.status(400).json({ error: "Invalid section" });
    }

    const prompt = `You are a professional travel expert. Generate the "${section}" section for a travel guide for the user's current location: ${currentLocation}.
Traveler Age: ${age}
Trip type: ${tripType}
Duration: ${duration} days
Budget: ${budget || 'Not specified'}
Food Preference: ${foodPreference || 'Any'}
Religion / Beliefs: ${religion || 'None specified'}
Adventure Level: ${adventureLevel || 'Medium'}
Walking Preference: ${walkingPreference || 'Medium'}
Languages spoken: ${languages || 'Not specified'}
Special Interests: ${interests || 'None specified'}

Tailor the recommendations, tone, and activities to be perfect for this traveler profile. Keep in mind their budget, food, and walking preferences when suggesting places.

You MUST return a valid JSON object matching the following JSON schema:
${JSON.stringify(sectionSchema, null, 2)}

Do not return markdown, only the raw JSON object.
Here is what you need to generate for this section:
${sectionPrompt}`;

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
    console.error("Generate section error:", error);
    return res.status(500).json({ error: "Failed to generate section" });
  }
}
