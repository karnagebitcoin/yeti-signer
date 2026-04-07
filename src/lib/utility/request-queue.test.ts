import { describe, expect, it } from 'vitest';

import { shouldQueueRequest } from './request-queue';

describe('shouldQueueRequest', () => {
	it('allows a new request when no matching id is queued or pending', () => {
		expect(
			shouldQueueRequest(
				[{ message: { id: 'existing-request' } }],
				{ 'pending-request': {} },
				{ id: 'new-request' }
			)
		).toBe(true);
	});

	it('rejects a duplicate request id that is already queued', () => {
		expect(
			shouldQueueRequest(
				[{ message: { id: 'same-request' } }],
				{},
				{ id: 'same-request' }
			)
		).toBe(false);
	});

	it('rejects a duplicate request id that is already awaiting a response', () => {
		expect(
			shouldQueueRequest(
				[],
				{ 'same-request': { domain: 'example.com' } },
				{ id: 'same-request' }
			)
		).toBe(false);
	});
});
