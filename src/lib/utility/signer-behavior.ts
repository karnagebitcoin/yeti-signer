export const SIGNER_BEHAVIOR_KEY = 'signerBehavior';

export type SignerBehaviorMode = 'auto_sign' | 'smart_sign' | 'manual_sign';

export interface SignerBehaviorOption {
	mode: SignerBehaviorMode;
	title: string;
	summary: string;
	description: string;
	icon: string;
}

export const DEFAULT_SIGNER_BEHAVIOR: SignerBehaviorMode = 'auto_sign';

export const SIGNER_BEHAVIOR_OPTIONS: SignerBehaviorOption[] = [
	{
		mode: 'auto_sign',
		title: 'Auto mode',
		summary: 'Sign everything',
		description: 'No prompts. The signer handles every request automatically.',
		icon: 'solar:magic-stick-3-linear'
	},
	{
		mode: 'smart_sign',
		title: 'Smart mode',
		summary: 'Sign common events',
		description: 'Auto-signs common Nostr events and asks for uncommon ones.',
		icon: 'solar:shield-check-linear'
	},
	{
		mode: 'manual_sign',
		title: 'Manual mode',
		summary: 'Ask every time',
		description: 'Shows a prompt before every signing or encryption request.',
		icon: 'mdi:hand-back-right-outline'
	}
];

const COMMON_SIGN_EVENT_KINDS = new Set<number>([
	0, // Metadata
	1, // Note
	3, // Follows
	4, // Direct messages
	5, // Event deletion
	6, // Repost
	7, // Reaction
	8, // Badge award
	16, // Generic repost
	40, // Channel create
	41, // Channel metadata
	42, // Channel message
	43, // Channel hide
	44, // Channel mute
	9734, // Zap request
	9735, // Zap receipt
	10000, // Mute list
	10001, // Pin list
	10002, // Relay list
	10003, // Bookmark list
	10004, // Communities list
	10005, // Public chats list
	10006, // Block relay list
	10007, // Search relay list
	10015, // Interests list
	30023, // Long-form content
	30024 // Draft long-form content
]);

interface RequestLike {
	type: string;
	params?: any;
}

const isCommonSignEvent = (params: any): boolean => {
	const event = params?.event || params;
	if (!event || typeof event.kind !== 'number') return false;

	const kind = event.kind as number;
	if (COMMON_SIGN_EVENT_KINDS.has(kind)) return true;

	// Most standardized list events
	if (kind >= 10000 && kind < 20000) return true;

	// Most standardized parameterized replaceable events
	if (kind >= 30000 && kind < 40000) return true;

	return false;
};

export const isCommonSignerRequest = (request: RequestLike): boolean => {
	switch (request.type) {
		case 'getPublicKey':
		case 'getRelays':
		case 'nip04.encrypt':
		case 'nip04.decrypt':
		case 'nip44.encrypt':
		case 'nip44.decrypt':
			return true;
		case 'signEvent':
			return isCommonSignEvent(request.params);
		default:
			return false;
	}
};

export const shouldAutoApproveRequest = (
	mode: SignerBehaviorMode,
	request: RequestLike
): boolean => {
	if (mode === 'auto_sign') return true;
	if (mode === 'smart_sign') return isCommonSignerRequest(request);
	return false;
};
