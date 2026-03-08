const ADJECTIVES = [
	'Bright',
	'Brave',
	'Calm',
	'Clever',
	'Cosmic',
	'Daring',
	'Dreamy',
	'Eager',
	'Fancy',
	'Fearless',
	'Friendly',
	'Gentle',
	'Glowing',
	'Golden',
	'Happy',
	'Honest',
	'Jolly',
	'Kind',
	'Lively',
	'Lucky',
	'Mellow',
	'Merry',
	'Mighty',
	'Nimble',
	'Noble',
	'Playful',
	'Proud',
	'Quiet',
	'Radiant',
	'Shiny',
	'Smart',
	'Spry',
	'Steady',
	'Sunny',
	'Swift',
	'Tricky',
	'Vivid',
	'Warm',
	'Wise',
	'Witty'
];

const ANIMALS = [
	'Badger',
	'Bear',
	'Beaver',
	'Bison',
	'Butterfly',
	'Cat',
	'Cheetah',
	'Cobra',
	'Crane',
	'Crow',
	'Dolphin',
	'Eagle',
	'Falcon',
	'Fox',
	'Frog',
	'Gazelle',
	'Gecko',
	'Hawk',
	'Hedgehog',
	'Heron',
	'Koala',
	'Lemur',
	'Leopard',
	'Lynx',
	'Moose',
	'Octopus',
	'Otter',
	'Owl',
	'Panda',
	'Panther',
	'Penguin',
	'Puma',
	'Rabbit',
	'Raven',
	'Seal',
	'Tiger',
	'Toucan',
	'Turtle',
	'Whale',
	'Wolf'
];

const normalizeName = (value: string) => value.trim().toLowerCase();

const randomItem = (items: string[]) => items[Math.floor(Math.random() * items.length)];

export const generateFriendlyAccountName = (existingNames: Iterable<string> = []): string => {
	const taken = new Set(
		Array.from(existingNames)
			.filter(Boolean)
			.map((name) => normalizeName(name))
	);

	for (let attempt = 0; attempt < 160; attempt += 1) {
		const candidate = `${randomItem(ADJECTIVES)} ${randomItem(ANIMALS)}`;
		if (!taken.has(normalizeName(candidate))) return candidate;
	}

	for (const adjective of ADJECTIVES) {
		for (const animal of ANIMALS) {
			const candidate = `${adjective} ${animal}`;
			if (!taken.has(normalizeName(candidate))) return candidate;
		}
	}

	return 'Bright Otter';
};
