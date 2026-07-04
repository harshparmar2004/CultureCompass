import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { lat, lon } = req.query;
    const apiKey = process.env.VITE_GEOAPIFY_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: "VITE_GEOAPIFY_API_KEY not configured" });
    }
    
    const response = await fetch(`https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${apiKey}`);
    
    if (!response.ok) {
      throw new Error(`Geoapify error: ${response.status}`);
    }
    
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("Geocode error:", error);
    return res.status(500).json({ error: "Failed to geocode" });
  }
}
