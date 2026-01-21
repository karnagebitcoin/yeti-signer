# Testing Guide - keys.band

Ce document explique comment utiliser les tests Vitest configurés pour l'application keys.band.

## Installation des dépendances

Les dépendances de test ont été installées avec pnpm :
- `vitest` - Framework de test
- `@vitest/ui` - Interface utilisateur pour les tests
- `jsdom` - Environnement DOM simulé
- `@testing-library/svelte` - Utilitaires de test pour Svelte
- `happy-dom` - Alternative légère à jsdom

## Scripts de test disponibles

```bash
# Exécuter les tests en mode watch
pnpm test

# Exécuter les tests avec l'interface UI
pnpm test:ui

# Exécuter les tests une seule fois
pnpm test:run

# Exécuter les tests avec couverture de code
pnpm test:coverage
```

## Structure des tests

```
src/
├── lib/
│   ├── utility/
│   │   ├── nostr-utils.test.ts        # Tests unitaires Nostr
│   │   └── utils.test.ts              # Tests utilitaires (à créer)
│   └── controllers/
│       ├── profile.controller.test.ts # Tests contrôleurs de profil
│       └── background.controller.test.ts (à créer)
├── test/
│   ├── setup.ts                       # Configuration globale des tests
│   └── mocks/
│       ├── browser.mock.ts            # Mocks pour l'extension browser
│       └── nostr.mock.ts              # Mocks pour Nostr
└── test/integration/
    ├── relay-publish.test.ts          # Tests d'intégration relais
    └── browser-storage.test.ts        # Tests stockage browser
```

## Types de tests

### 1. Tests Unitaires

Tests isolés pour des fonctions spécifiques :

- **Nostr Utils** (`nostr-utils.test.ts`)
  - `checkNSEC()` - Validation et décodage de clés
  - `getRelaysList()` - Gestion de liste de relais
  - Tests exécutables en console

- **Profile Controller** (`profile.controller.test.ts`)
  - `validateProfile()` - Validation de profils
  - `generateProfileId()` - Génération d'ID
  - `sanitizeRelayUrl()` - Nettoyage d'URLs de relais
  - Tests exécutables en console

### 2. Tests d'Intégration

Tests vérifiant les interactions entre composants :

- **Relay Publication** (`relay-publish.test.ts`)
  - Publication d'événements vers les relais
  - Vérification de l'utilisation des relais de test
  - Gestion des erreurs de connexion
  - Vérification que les fonctions utilisent bien les relais

- **Browser Storage** (`browser-storage.test.ts`)
  - Stockage et récupération de données
  - Gestion des sessions
  - Gestion des paramètres
  - Tests exécutables en console

### 3. Tests Console

Fonctions qui peuvent être exécutées directement dans la console du navigateur :

```javascript
// Exemple : checkNSEC
const result = await checkNSEC('nsec1...');
console.log(result);

// Exemple : getRelaysList
const relays = getRelaysList();
console.log(relays);

// Exemple : sanitizeRelayUrl
const cleanUrl = sanitizeRelayUrl('relay.example.com');
console.log(cleanUrl);
```

## Mocks configurés

### Browser Mock (`browser.mock.ts`)

Mock de l'extension browser pour simuler :
- `get()` - Récupération de données
- `set()` - Stockage de données
- `getCurrentTab()` - Onglet actuel
- `injectJsInTab()` - Injection de JavaScript
- `createWindow()` - Création de fenêtre
- `switchIcon()` - Changement d'icône
- `sendAuthorizationResponse()` - Réponse d'autorisation

### Nostr Mock (`nostr.mock.ts`)

Mock des fonctionnalités Nostr :
- `SimplePool` - Pool de relays simulé
- `Event` - Événement Nostr de test
- `Relay` - Relay de test
- `RelayList` - Liste de relais par défaut

## Exécuter des tests spécifiques

```bash
# Exécuter un fichier de test spécifique
pnpm test nostr-utils.test.ts

# Exécuter tous les tests d'un dossier
pnpm test src/lib/utility/

# Exécuter des tests correspondant à un pattern
pnpm test --grep "checkNSEC"
```

## Couverture de code

Pour voir la couverture de code :

```bash
pnpm test:coverage
```

Le rapport sera généré dans le dossier `coverage/`.

## Débogage des tests

### Mode watch

```bash
pnpm test
```

Les tests se réexécutent automatiquement lors des modifications.

### Interface UI

```bash
pnpm test:ui
```

Ouvre une interface web interactive pour visualiser et exécuter les tests.

### Console

Utilisez `console.log()` dans les tests pour déboguer. Les messages apparaîtront dans la console Vitest.

## Ajouter de nouveaux tests

### Structure d'un test

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Nom du module', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('devrait faire quelque chose', () => {
		// Arrange
		const input = 'test';

		// Act
		const result = maFonction(input);

		// Assert
		expect(result).toBe('expected');
	});
});
```

### Tests avec mocks

```typescript
import { vi } from 'vitest';

// Mock d'un module
vi.mock('$lib/utility', () => ({
	maFonction: vi.fn().mockReturnValue('mocked value')
}));

// Utilisation dans le test
it('devrait utiliser le mock', () => {
	const result = maFonction();
	expect(result).toBe('mocked value');
});
```

## Résolution des problèmes

### Erreurs TypeScript

Les erreurs TypeScript liées à ES5/ES2015 sont dues à la configuration du compilateur. Elles n'affectent pas l'exécution des tests.

### Tests qui échouent

1. Vérifiez que les mocks sont correctement configurés
2. Assurez-vous que les dépendances sont à jour : `pnpm install`
3. Nettoyez le cache : `pnpm test --clearCache`

### Problèmes de performance

- Utilisez `--reporter=verbose` pour voir plus de détails
- Exécutez les tests en parallèle avec `--threads`
- Limitez les tests avec `--grep` pour cibler des tests spécifiques

## Bonnes pratiques

1. **Tests unitaires** : Testez une fonction à la fois
2. **Tests d'intégration** : Testez les interactions entre composants
3. **Tests console** : Assurez-vous que les fonctions peuvent être exécutées manuellement
4. **Mocks** : Utilisez des mocks pour éviter les dépendances externes
5. **Nommage** : Utilisez des noms descriptifs pour les tests
6. **AAA** : Arrange - Act - Assert pour structurer les tests

## Ressources

- [Documentation Vitest](https://vitest.dev/)
- [Documentation Testing Library](https://testing-library.com/)
- [Nostr NIPs](https://github.com/nostr-protocol/nips)
