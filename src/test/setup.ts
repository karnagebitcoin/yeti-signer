import { vi } from 'vitest';
import { beforeEach } from 'vitest';

beforeEach(() => {
	vi.clearAllMocks();
});

vi.mock('webextension-polyfill', () => ({
	default: {
		runtime: {
			onMessage: {
				addListener: vi.fn(),
				removeListener: vi.fn()
			},
			sendMessage: vi.fn()
		},
		tabs: {
			query: vi.fn().mockResolvedValue([{ id: 1, url: 'https://example.com' }]),
			create: vi.fn(),
			get: vi.fn().mockResolvedValue({ id: 1, url: 'https://example.com' }),
			onActivated: {
				addListener: vi.fn(),
				removeListener: vi.fn()
			},
			onUpdated: {
				addListener: vi.fn(),
				removeListener: vi.fn()
			}
		},
		storage: {
			local: {
				get: vi.fn().mockResolvedValue({}),
				set: vi.fn().mockResolvedValue(undefined)
			}
		}
	}
}));
