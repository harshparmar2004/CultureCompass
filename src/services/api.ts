export const generateDayPlan = async (
  currentLocation: string,
  timeAvailable: string,
  budgetAvailable: string,
  travelingWith: string
) => {
  const res = await fetch('/api/generate-day-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      currentLocation, 
      timeAvailable, 
      budgetAvailable, 
      travelingWith 
    }),
  });
  
  if (!res.ok) {
    throw new Error('Failed to generate day plan. Please try again.');
  }
  
  const data = await res.json();
  return data.plan;
};

export const fetchSectionData = async (
  sectionId: string,
  searchParams: {
    currentLocation: string;
    age: string | number;
    tripType: string;
    duration: number;
    budget: string;
    foodPreference: string;
    religion: string;
    adventureLevel: string;
    walkingPreference: string;
    languages: string;
    interests: string;
  },
  isRegenerate: boolean = false
) => {
  const res = await fetch('/api/generate-section', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...searchParams,
      section: sectionId,
      isRegenerate
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Server returned ${res.status}: ${text}`);
  }
  
  return await res.json();
};
