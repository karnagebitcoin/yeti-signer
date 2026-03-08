# Yeti Signer

## A coooool Nostr signer

Yeti Signer is a browser extension for signing Nostr events without handing websites your private key.

It implements NIP-07 and provides a `window.nostr` object with the usual methods:

```ts
await window.nostr.getPublicKey();
await window.nostr.signEvent(event);
await window.nostr.getRelays();
await window.nostr.nip04.encrypt(pubkey, plaintext);
await window.nostr.nip04.decrypt(pubkey, ciphertext);
```

## Highlights

- Multiple identities in one extension
- Friendly signing modes: auto, smart, and manual
- Encrypted local storage and encrypted backups
- Cleaner wording and a simpler onboarding flow

## Developing

Install dependencies:

```bash
pnpm install
```

Build in watch mode:

```bash
pnpm run dev
```

## Building

Chrome build:

```bash
pnpm run build
```

Firefox build:

```bash
pnpm run build:firefox
```

## Load Unpacked In Chrome

1. Run `pnpm run build`.
2. Open `chrome://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Choose the `build/` folder in this repository.
