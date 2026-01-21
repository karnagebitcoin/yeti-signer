import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkNSEC, getRelaysList } from './nostr-utils';

vi.mock('nostr-tools', () => ({
	SimplePool: vi.fn(),
	finishEvent: vi.fn(),
	getPublicKey: vi.fn(),
	nip19: {
		decode: vi.fn()
	}
}));

describe('Nostr Utils - checkNSEC', () => {
	it('should accept valid 64-char hex key', async () => {
		const mockPrivateKey = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
		const result = await checkNSEC(mockPrivateKey);
		expect(result).toBe(mockPrivateKey);
	});

	it('should reject invalid key length', async () => {
		await expect(checkNSEC('short')).rejects.toThrow('Invalid key');
	});
});

describe('Nostr Utils - getRelaysList', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return default relays when no user profile', () => {
		const relays = getRelaysList();
		expect(relays).toContain('wss://nos.lol');
		expect(relays).toContain('wss://relay.damus.io');
		expect(relays).toContain('wss://nostr.wine');
	});

	it('should return default relays when all=true', () => {
		const relays = getRelaysList(true);
		expect(relays.length).toBeGreaterThan(0);
	});
});

describe('Nostr Utils - Console Executable Functions', () => {
	it('checkNSEC can be executed in console', async () => {
		const privateKey = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
		const result = await checkNSEC(privateKey);
		expect(typeof result).toBe('string');
		expect(result.length).toBe(64);
	});

	it('getRelaysList can be executed in console', () => {
		const relays = getRelaysList();
		expect(Array.isArray(relays)).toBe(true);
		expect(relays.length).toBeGreaterThan(0);
		expect(relays.every(relay => typeof relay === 'string' && relay.startsWith('wss://'))).toBe(true);
	});
});
