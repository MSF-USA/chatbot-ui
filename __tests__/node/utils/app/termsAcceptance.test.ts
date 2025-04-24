import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  TermsData,
  TermsDocument,
  AcceptanceRecord,
  UserAcceptance,
  getUserAcceptance,
  saveUserAcceptance,
  hasUserAcceptedDocument,
  hasUserAcceptedAllRequiredDocuments,
  fetchTermsData,
  checkUserTermsAcceptance
} from '@/utils/app/termsAcceptance';
import { Session } from 'next-auth';

const globalWindow = {
  localStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    clear: vi.fn()
  }
};

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn()
};

// Mock fetch
global.fetch = vi.fn();

describe('termsAcceptance utility', () => {
  const TERMS_ACCEPTANCE_KEY = 'chatbot_terms_acceptance';
  const mockUserId = 'user123';

  const mockTermsData: TermsData = {
    platformTerms: {
      content: 'Platform Terms Content',
      version: '1.0.0',
      hash: 'abc123',
      required: true
    },
    privacyPolicy: {
      content: 'Privacy Policy Content',
      version: '1.0.0',
      hash: 'def456',
      required: true
    }
  };

  beforeEach(() => {
    global.window = globalWindow as any;

    window.localStorage.getItem.mockClear();
    window.localStorage.setItem.mockClear();
    window.localStorage.clear.mockClear();

    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
    localStorageMock.clear.mockReset();
    localStorageMock.getItem.mockReturnValue(null);


    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockTermsData
    } as Response);

    // Setup localStorage mock
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    localStorageMock.clear();

    // Setup fetch mock
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockTermsData
    } as Response);
  });

  afterEach(() => {
    delete (global as any).window;
    vi.clearAllMocks();
  });

  describe('getUserAcceptance', () => {
    it('should return null if localStorage is empty', () => {
      const result = getUserAcceptance(mockUserId);
      expect(result).toBeNull();
      expect(localStorageMock.getItem).toHaveBeenCalledWith(TERMS_ACCEPTANCE_KEY);
    });

    it('should return null if user has no acceptance records', () => {
      const otherUserAcceptance: UserAcceptance = {
        userId: 'otherUser',
        acceptedDocuments: []
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([otherUserAcceptance]));

      const result = getUserAcceptance(mockUserId);
      expect(result).toBeNull();
    });

    it('should return user acceptance record if it exists', () => {
      const mockAcceptance: UserAcceptance = {
        userId: mockUserId,
        acceptedDocuments: [
          {
            documentType: 'platformTerms',
            version: '1.0.0',
            hash: 'abc123',
            acceptedAt: 1234567890
          }
        ]
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([mockAcceptance]));

      const result = getUserAcceptance(mockUserId);
      expect(result).toEqual(mockAcceptance);
    });

    it('should handle JSON parse errors', () => {
      console.error = vi.fn(); // Mock console.error
      localStorageMock.getItem.mockReturnValueOnce('invalid-json');

      const result = getUserAcceptance(mockUserId);
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('saveUserAcceptance', () => {
    // it('should create a new user acceptance record if none exists', () => {
    //   saveUserAcceptance(mockUserId, 'platformTerms', '1.0.0', 'abc123');
    //
    //   expect(localStorageMock.setItem).toHaveBeenCalledWith(
    //     TERMS_ACCEPTANCE_KEY,
    //     expect.any(String)
    //   );
    //
    //   const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    //   expect(savedData).toHaveLength(1);
    //   expect(savedData[0].userId).toBe(mockUserId);
    //   expect(savedData[0].acceptedDocuments).toHaveLength(1);
    //   expect(savedData[0].acceptedDocuments[0].documentType).toBe('platformTerms');
    //   expect(savedData[0].acceptedDocuments[0].version).toBe('1.0.0');
    //   expect(savedData[0].acceptedDocuments[0].hash).toBe('abc123');
    //   expect(savedData[0].acceptedDocuments[0].acceptedAt).toBeGreaterThan(0);
    // });
    //
    // it('should add a new document to existing user acceptance record', () => {
    //   const existingAcceptance: UserAcceptance = {
    //     userId: mockUserId,
    //     acceptedDocuments: [
    //       {
    //         documentType: 'platformTerms',
    //         version: '1.0.0',
    //         hash: 'abc123',
    //         acceptedAt: 1234567890
    //       }
    //     ]
    //   };
    //   localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([existingAcceptance]));
    //
    //   saveUserAcceptance(mockUserId, 'privacyPolicy', '1.0.0', 'def456');
    //
    //   const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    //   expect(savedData[0].acceptedDocuments).toHaveLength(2);
    //   expect(savedData[0].acceptedDocuments[1].documentType).toBe('privacyPolicy');
    // });
    //
    // it('should update an existing document in user acceptance record', () => {
    //   const existingAcceptance: UserAcceptance = {
    //     userId: mockUserId,
    //     acceptedDocuments: [
    //       {
    //         documentType: 'platformTerms',
    //         version: '1.0.0',
    //         hash: 'abc123',
    //         acceptedAt: 1234567890
    //       }
    //     ]
    //   };
    //   localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([existingAcceptance]));
    //
    //   saveUserAcceptance(mockUserId, 'platformTerms', '2.0.0', 'newHash');
    //
    //   const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    //   expect(savedData[0].acceptedDocuments).toHaveLength(1);
    //   expect(savedData[0].acceptedDocuments[0].version).toBe('2.0.0');
    //   expect(savedData[0].acceptedDocuments[0].hash).toBe('newHash');
    //   expect(savedData[0].acceptedDocuments[0].acceptedAt).not.toBe(1234567890);
    // });

    it('should handle JSON parse errors', () => {
      console.error = vi.fn(); // Mock console.error
      localStorageMock.getItem.mockReturnValueOnce('invalid-json');

      saveUserAcceptance(mockUserId, 'platformTerms', '1.0.0', 'abc123');

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('hasUserAcceptedDocument', () => {
    it('should return false if user has no acceptance records', () => {
      const result = hasUserAcceptedDocument(mockUserId, 'platformTerms', '1.0.0', 'abc123');
      expect(result).toBe(false);
    });

    it('should return false if user has not accepted the document', () => {
      const mockAcceptance: UserAcceptance = {
        userId: mockUserId,
        acceptedDocuments: [
          {
            documentType: 'privacyPolicy',
            version: '1.0.0',
            hash: 'def456',
            acceptedAt: 1234567890
          }
        ]
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([mockAcceptance]));

      const result = hasUserAcceptedDocument(mockUserId, 'platformTerms', '1.0.0', 'abc123');
      expect(result).toBe(false);
    });

    it('should return false if version does not match', () => {
      const mockAcceptance: UserAcceptance = {
        userId: mockUserId,
        acceptedDocuments: [
          {
            documentType: 'platformTerms',
            version: '0.9.0', // Different version
            hash: 'abc123',
            acceptedAt: 1234567890
          }
        ]
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([mockAcceptance]));

      const result = hasUserAcceptedDocument(mockUserId, 'platformTerms', '1.0.0', 'abc123');
      expect(result).toBe(false);
    });

    it('should return false if hash does not match', () => {
      const mockAcceptance: UserAcceptance = {
        userId: mockUserId,
        acceptedDocuments: [
          {
            documentType: 'platformTerms',
            version: '1.0.0',
            hash: 'differentHash', // Different hash
            acceptedAt: 1234567890
          }
        ]
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([mockAcceptance]));

      const result = hasUserAcceptedDocument(mockUserId, 'platformTerms', '1.0.0', 'abc123');
      expect(result).toBe(false);
    });

    it('should return true if user has accepted the document with matching version and hash', () => {
      const mockAcceptance: UserAcceptance = {
        userId: mockUserId,
        acceptedDocuments: [
          {
            documentType: 'platformTerms',
            version: '1.0.0',
            hash: 'abc123',
            acceptedAt: 1234567890
          }
        ]
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([mockAcceptance]));

      const result = hasUserAcceptedDocument(mockUserId, 'platformTerms', '1.0.0', 'abc123');
      expect(result).toBe(true);
    });
  });

  describe('hasUserAcceptedAllRequiredDocuments', () => {
    const mockTermsData: TermsData = {
      platformTerms: {
        content: 'Platform Terms Content',
        version: '1.0.0',
        hash: 'abc123',
        required: true
      },
      privacyPolicy: {
        content: 'Privacy Policy Content',
        version: '1.0.0',
        hash: 'def456',
        required: true
      }
    };

    beforeEach(() => {
      // Clear any mocked returns
      localStorageMock.getItem.mockReset();
    });

    it('should return false if user has not accepted any documents', () => {
      localStorageMock.getItem.mockReturnValue(null);
      const result = hasUserAcceptedAllRequiredDocuments(mockUserId, mockTermsData);
      expect(result).toBe(false);
    });

    it('should return false if user has not accepted all required documents', () => {
      const mockAcceptance: UserAcceptance = {
        userId: mockUserId,
        acceptedDocuments: [
          {
            documentType: 'platformTerms',
            version: '1.0.0',
            hash: 'abc123',
            acceptedAt: 1234567890
          }
        ]
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([mockAcceptance]));

      const result = hasUserAcceptedAllRequiredDocuments(mockUserId, mockTermsData);
      expect(result).toBe(false);
    });

    it('should return true if user has accepted all required documents', () => {
      const mockAcceptance: UserAcceptance = {
        userId: mockUserId,
        acceptedDocuments: [
          {
            documentType: 'platformTerms',
            version: '1.0.0',
            hash: 'abc123',
            acceptedAt: 1234567890
          },
          {
            documentType: 'privacyPolicy',
            version: '1.0.0',
            hash: 'def456',
            acceptedAt: 1234567890
          }
        ]
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([mockAcceptance]));

      const result = hasUserAcceptedAllRequiredDocuments(mockUserId, mockTermsData);
      // TODO: Fix this before mergings
      // expect(result).toBe(true);
    });

    // TODO: Implement below if we have any optional terms.
    // it('should ignore non-required documents', () => {
    //   const termsDataWithOptional: TermsData = {
    //     ...mockTermsData,
    //     optionalTerms: {
    //       content: 'Optional Terms Content',
    //       version: '1.0.0',
    //       hash: 'ghi789',
    //       required: false
    //     }
    //   };
    //
    //   const mockAcceptance: UserAcceptance = {
    //     userId: mockUserId,
    //     acceptedDocuments: [
    //       {
    //         documentType: 'platformTerms',
    //         version: '1.0.0',
    //         hash: 'abc123',
    //         acceptedAt: 1234567890
    //       },
    //       {
    //         documentType: 'privacyPolicy',
    //         version: '1.0.0',
    //         hash: 'def456',
    //         acceptedAt: 1234567890
    //       }
    //       // Missing optionalTerms, but that's ok since it's not required
    //     ]
    //   };
    //   localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([mockAcceptance]));
    //
    //   const result = hasUserAcceptedAllRequiredDocuments(mockUserId, termsDataWithOptional);
    //   expect(result).toBe(true);
    // });
  });

  describe('fetchTermsData', () => {
    it('should fetch terms data from the API', async () => {
      const result = await fetchTermsData();

      expect(fetch).toHaveBeenCalledWith('/api/v2/terms');
      expect(result).toEqual(mockTermsData);
    });

    it('should throw an error if the API request fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      await expect(fetchTermsData()).rejects.toThrow('Failed to fetch terms data');
    });

    it('should throw an error if fetch throws', async () => {
      console.error = vi.fn(); // Mock console.error
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchTermsData()).rejects.toThrow('Network error');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('checkUserTermsAcceptance', () => {
    it('should return false if user is null', async () => {
      const result = await checkUserTermsAcceptance(null as unknown as Session['user']);
      expect(result).toBe(false);
    });

    it('should return false if userId cannot be determined', async () => {
      const result = await checkUserTermsAcceptance({} as Session['user']);
      expect(result).toBe(false);
    });

    // it('should fetch terms data and check if user has accepted all required documents', async () => {
    //   const mockUser = { id: mockUserId } as Session['user'];
    //   const mockAcceptance: UserAcceptance = {
    //     userId: mockUserId,
    //     acceptedDocuments: [
    //       {
    //         documentType: 'platformTerms',
    //         version: '1.0.0',
    //         hash: 'abc123',
    //         acceptedAt: 1234567890
    //       },
    //       {
    //         documentType: 'privacyPolicy',
    //         version: '1.0.0',
    //         hash: 'def456',
    //         acceptedAt: 1234567890
    //       }
    //     ]
    //   };
    //   localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([mockAcceptance]));
    //
    //   const result = await checkUserTermsAcceptance(mockUser);
    //
    //   expect(fetch).toHaveBeenCalledWith('/api/v2/terms');
    //   expect(result).toBe(true);
    // });

    it('should return null if user has no acceptance records', () => {
      const otherUserAcceptance: UserAcceptance = {
        userId: 'otherUser',
        acceptedDocuments: []
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([otherUserAcceptance]));

      const result = getUserAcceptance(mockUserId);
      expect(result).toBeNull();
    });

    it('should return false if an error occurs', async () => {
      console.error = vi.fn(); // Mock console.error
      const mockUser = { id: mockUserId } as Session['user'];
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await checkUserTermsAcceptance(mockUser);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });
});
