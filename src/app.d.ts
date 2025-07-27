// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}

	// NIP-07 Browser Extension Support
	interface Window {
		nostr?: {
			getPublicKey(): Promise<string>;
			signEvent(event: {
				kind: number;
				content: string;
				tags: string[][];
				created_at: number;
				pubkey?: string;
			}): Promise<{
				id: string;
				pubkey: string;
				created_at: number;
				kind: number;
				tags: string[][];
				content: string;
				sig: string;
			}>;
			getRelays?(): Promise<Record<string, { read: boolean; write: boolean }>>;
			nip04?: {
				encrypt(pubkey: string, plaintext: string): Promise<string>;
				decrypt(pubkey: string, ciphertext: string): Promise<string>;
			};
		};
	}
}

export {};
