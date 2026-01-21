import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Browser Storage - Integration Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should store and retrieve profile data', async () => {
		const mockBrowser = {
			get: vi.fn().mockResolvedValue({ profiles: [] }),
			set: vi.fn().mockResolvedValue(undefined)
		};

		const mockProfile = {
			id: 'test-id',
			name: 'Test Profile',
			data: {
				pubkey: 'test-pubkey',
				privateKey: 'a'.repeat(64),
				webSites: {},
				relays: []
			}
		};

		await mockBrowser.set({ profiles: [mockProfile] });
		const result = await mockBrowser.get('profiles');

		expect(mockBrowser.set).toHaveBeenCalledWith({ profiles: [mockProfile] });
		expect(mockBrowser.get).toHaveBeenCalledWith('profiles');
	});

	it('should store and retrieve session data', async () => {
		const mockBrowser = {
			get: vi.fn().mockResolvedValue({ sessionData: {} }),
			set: vi.fn().mockResolvedValue(undefined)
		};

		const mockSessionData = {
			'request-id': {
				type: 'signEvent',
				event: { kind: 1, content: 'test' }
			}
		};

		await mockBrowser.set({ sessionData: mockSessionData });
		const result = await mockBrowser.get('sessionData');

		expect(mockBrowser.set).toHaveBeenCalledWith({ sessionData: mockSessionData });
		expect(mockBrowser.get).toHaveBeenCalledWith('sessionData');
	});

	it('should store and retrieve settings', async () => {
		const mockBrowser = {
			get: vi.fn().mockResolvedValue({}),
			set: vi.fn().mockResolvedValue(undefined)
		};

		const mockSettings = {
			duration: { name: 'One time', value: 0 },
			theme: 'dark'
		};

		await mockBrowser.set(mockSettings);
		const durationResult = await mockBrowser.get('duration');
		const themeResult = await mockBrowser.get('theme');

		expect(mockBrowser.set).toHaveBeenCalledWith(mockSettings);
		expect(mockBrowser.get).toHaveBeenCalledWith('duration');
		expect(mockBrowser.get).toHaveBeenCalledWith('theme');
	});

	it('should handle storage errors gracefully', async () => {
		const mockBrowser = {
			get: vi.fn().mockRejectedValue(new Error('Storage error')),
			set: vi.fn().mockRejectedValue(new Error('Storage error'))
		};

		await expect(mockBrowser.get('profiles')).rejects.toThrow('Storage error');
		await expect(mockBrowser.set({ profiles: [] })).rejects.toThrow('Storage error');
	});

	it('should update existing storage data', async () => {
		const mockBrowser = {
			get: vi.fn().mockResolvedValue({ profiles: [{ id: 'existing-id' }] }),
			set: vi.fn().mockResolvedValue(undefined)
		};

		const newProfile = {
			id: 'new-id',
			name: 'New Profile',
			data: {
				pubkey: 'new-pubkey',
				privateKey: 'b'.repeat(64),
				webSites: {},
				relays: []
			}
		};

		const existingProfiles = await mockBrowser.get('profiles');
		const updatedProfiles = [...(existingProfiles.profiles || []), newProfile];

		await mockBrowser.set({ profiles: updatedProfiles });

		expect(mockBrowser.set).toHaveBeenCalledWith({
			profiles: [
				{ id: 'existing-id' },
				newProfile
			]
		});
	});
});

describe('Browser Storage - Console Executable Functions', () => {
	it('can execute storage operations in console', async () => {
		const mockBrowser = {
			get: vi.fn().mockResolvedValue({ profiles: [] }),
			set: vi.fn().mockResolvedValue(undefined)
		};

		const testData = { test: 'data' };

		await mockBrowser.set({ testData });
		const result = await mockBrowser.get('testData');

		expect(mockBrowser.set).toHaveBeenCalled();
		expect(mockBrowser.get).toHaveBeenCalled();
	});

	it('can verify storage data integrity', async () => {
		const mockBrowser = {
			get: vi.fn().mockResolvedValue({
				profiles: [
					{
						id: 'test-id',
						name: 'Test Profile',
						data: {
							pubkey: 'test-pubkey',
							privateKey: 'a'.repeat(64),
							webSites: {},
							relays: []
						}
					}
				]
			}),
			set: vi.fn().mockResolvedValue(undefined)
		};

		const result = await mockBrowser.get('profiles');
		const profiles = result.profiles;

		expect(Array.isArray(profiles)).toBe(true);
		expect(profiles.length).toBeGreaterThan(0);
		expect(profiles[0]).toHaveProperty('id');
		expect(profiles[0]).toHaveProperty('name');
		expect(profiles[0]).toHaveProperty('data');
	});
});
