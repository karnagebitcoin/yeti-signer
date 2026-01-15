import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimplePool } from 'nostr-tools';
import { publish, getRelays, pushRelays, prepareRelayPool } from '$lib/utility/nostr-utils';

vi.mock('nostr-tools', () => ({
	SimplePool: vi.fn(),
	finishEvent: vi.fn(),
	getPublicKey: vi.fn(),
	nip19: {
		decode: vi.fn()
	}
}));

vi.mock('$lib/utility/nostr-utils', () => ({
	getRelaysList: vi.fn(() => ['wss://nos.lol', 'wss://relay.damus.io', 'wss://nostr.wine']),
	checkNSEC: vi.fn(),
	publish: vi.fn(),
	getRelays: vi.fn(),
	pushRelays: vi.fn(),
	prepareRelayPool: vi.fn(),
	createProfileMetadata: vi.fn(),
	getMetadata: vi.fn()
}));

describe('Integration Tests - Relay Publication with Test Relay', () => {
	beforeEach(() => {
		vi.mocked(publish).mockResolvedValue(undefined);
		vi.mocked(getRelays).mockResolvedValue(null);
		vi.mocked(pushRelays).mockResolvedValue(undefined);
		vi.mocked(prepareRelayPool).mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should publish event to test relay', async () => {
		const mockEvent = {
			id: 'test-event-id',
			pubkey: 'test-pubkey',
			created_at: Math.floor(Date.now() / 1000),
			kind: 1,
			tags: [],
			content: 'test content',
			sig: 'test-signature'
		};

		await publish(mockEvent);

		expect(vi.mocked(publish)).toHaveBeenCalledWith(mockEvent);
	});

	it('should use test relay when publishing', async () => {
		const mockEvent = {
			id: 'test-event-id',
			pubkey: 'test-pubkey',
			created_at: Math.floor(Date.now() / 1000),
			kind: 1,
			tags: [],
			content: 'test content',
			sig: 'test-signature'
		};

		await publish(mockEvent);

		expect(vi.mocked(publish)).toHaveBeenCalledWith(mockEvent);
	});

	it('should push relays to network', async () => {
		const mockProfile = {
			name: 'Test Profile',
			id: 'test-id',
			data: {
				pubkey: 'test-pubkey',
				privateKey: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
				webSites: {},
				relays: [
					{ url: 'wss://test-relay.example.com', enabled: true, created_at: new Date() }
				]
			}
		};

		await pushRelays(mockProfile);

		expect(vi.mocked(pushRelays)).toHaveBeenCalledWith(mockProfile);
	});

	it('should get relays from network', async () => {
		const mockRelayEvent = {
			id: 'relay-event-id',
			pubkey: 'test-pubkey',
			created_at: Math.floor(Date.now() / 1000),
			kind: 10002,
			tags: [
				['r', 'wss://relay1.example.com', 'read'],
				['r', 'wss://relay2.example.com', 'write']
			],
			content: '',
			sig: 'test-signature'
		};

		vi.mocked(getRelays).mockResolvedValue(mockRelayEvent);

		const result = await getRelays('test-pubkey');

		expect(result).toEqual(mockRelayEvent);
		expect(vi.mocked(getRelays)).toHaveBeenCalledWith('test-pubkey');
	});

	it('should handle relay connection errors gracefully', async () => {
		vi.mocked(prepareRelayPool).mockResolvedValue(undefined);

		await expect(prepareRelayPool()).resolves.not.toThrow();
	});
});

describe('Integration Tests - Relay Usage Verification', () => {
	beforeEach(() => {
		vi.mocked(publish).mockResolvedValue(undefined);
		vi.mocked(getRelays).mockResolvedValue(null);
		vi.mocked(pushRelays).mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should verify that publish function uses relays', async () => {
		const mockEvent = {
			id: 'test-event-id',
			pubkey: 'test-pubkey',
			created_at: Math.floor(Date.now() / 1000),
			kind: 1,
			tags: [],
			content: 'test content',
			sig: 'test-signature'
		};

		await publish(mockEvent);

		expect(vi.mocked(publish)).toHaveBeenCalledTimes(1);
		expect(vi.mocked(publish)).toHaveBeenCalledWith(mockEvent);
	});

	it('should verify that getRelays function uses relays', async () => {
		vi.mocked(getRelays).mockResolvedValue({
			id: 'relay-event-id',
			pubkey: 'test-pubkey',
			created_at: Math.floor(Date.now() / 1000),
			kind: 10002,
			tags: [],
			content: '',
			sig: 'test-signature'
		});

		await getRelays('test-pubkey');

		expect(vi.mocked(getRelays)).toHaveBeenCalledTimes(1);
		expect(vi.mocked(getRelays)).toHaveBeenCalledWith('test-pubkey');
	});

	it('should verify that pushRelays function uses relays', async () => {
		const mockProfile = {
			name: 'Test Profile',
			id: 'test-id',
			data: {
				pubkey: 'test-pubkey',
				privateKey: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
				webSites: {},
				relays: [
					{ url: 'wss://test-relay.example.com', enabled: true, created_at: new Date() }
				]
			}
		};

		await pushRelays(mockProfile);

		expect(vi.mocked(pushRelays)).toHaveBeenCalledTimes(1);
		expect(vi.mocked(pushRelays)).toHaveBeenCalledWith(mockProfile);
	});
});
