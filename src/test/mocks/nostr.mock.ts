import { vi } from 'vitest';
import type { Event } from 'nostr-tools';

export const mockSimplePool = {
	ensureRelay: vi.fn().mockResolvedValue({
		close: vi.fn(),
		publish: vi.fn().mockResolvedValue('ok'),
		sub: vi.fn().mockReturnValue({
			unsub: vi.fn()
		}),
		get: vi.fn()
	}),
	get: vi.fn().mockResolvedValue(null),
	publish: vi.fn().mockResolvedValue('ok'),
	sub: vi.fn().mockReturnValue({
		unsub: vi.fn()
	}),
	close: vi.fn()
};

export const mockEvent: Event = {
	id: 'test-event-id',
	pubkey: 'test-pubkey',
	created_at: Math.floor(Date.now() / 1000),
	kind: 1,
	tags: [],
	content: 'test content',
	sig: 'test-signature'
};

export const mockRelay = 'wss://test-relay.example.com';

export const mockRelayList = ['wss://nos.lol', 'wss://relay.damus.io', 'wss://nostr.wine'];
