import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateDayPlan, fetchSectionData } from './api';

// Mock the global fetch function
global.fetch = vi.fn();

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateDayPlan', () => {
    it('should generate a day plan successfully', async () => {
      const mockPlan = [{ time: '9:00 AM', activity: 'Breakfast', description: 'Local cafe' }];
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plan: mockPlan }),
      });

      const result = await generateDayPlan('Paris', '9am-5pm', 'Medium', 'Solo');
      
      expect(result).toEqual(mockPlan);
      expect(global.fetch).toHaveBeenCalledWith('/api/generate-day-plan', expect.objectContaining({
        method: 'POST',
      }));
    });

    it('should throw an error if the response is not ok', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
      });

      await expect(generateDayPlan('Paris', '9am-5pm', 'Medium', 'Solo'))
        .rejects.toThrow('Failed to generate day plan. Please try again.');
    });
  });

  describe('fetchSectionData', () => {
    it('should fetch section data successfully', async () => {
      const mockData = { overview: 'A great city.' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const searchParams = {
        currentLocation: 'Tokyo',
        age: 30,
        tripType: 'Solo',
        duration: 5,
        budget: 'Medium',
        foodPreference: 'Any',
        religion: '',
        adventureLevel: 'Medium',
        walkingPreference: 'Medium',
        languages: '',
        interests: ''
      };

      const result = await fetchSectionData('overview', searchParams, false);
      
      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith('/api/generate-section', expect.objectContaining({
        method: 'POST',
      }));
    });
  });
});
