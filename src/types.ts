export interface Attraction {
  name: string;
  description: string;
  duration: string;
  relevanceTag: string;
}

export interface HiddenGem {
  name: string;
  whySpecial: string;
  localTip: string;
}

export interface Event {
  name: string;
  description: string;
  bestTimeToAttend: string;
}

export interface DayItinerary {
  day: number;
  morning: string[];
  afternoon: string[];
  evening: string[];
}

export interface ConnectExperience {
  name: string;
  description: string;
  meaningfulReason: string;
}

export interface DestinationData {
  overview: string;
  attractions: Attraction[];
  hiddenGems: HiddenGem[];
  storytelling: string;
  events: Event[];
  itinerary: DayItinerary[];
  connectLocally: ConnectExperience[];
}
