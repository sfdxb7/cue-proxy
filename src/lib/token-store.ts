/**
 * Simple JSON file-based token storage for the proxy.
 *
 * Tokens are stored in /opt/cue-proxy/data/tokens.json (or DATA_DIR env).
 * Each token maps to metadata (createdAt, lastUsed).
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

export interface TokenInfo {
  createdAt: string;
  lastUsed?: string;
  version?: string;
}

const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'data');
const TOKENS_FILE = join(DATA_DIR, 'tokens.json');

let tokenCache: Map<string, TokenInfo> | null = null;

/**
 * Ensure the data directory exists.
 */
export async function ensureDataDir(): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  // Initialize tokens file if it doesn't exist
  if (!existsSync(TOKENS_FILE)) {
    await writeFile(TOKENS_FILE, '{}', 'utf-8');
  }
}

/**
 * Load tokens from disk into memory cache.
 */
async function loadTokens(): Promise<Map<string, TokenInfo>> {
  if (tokenCache) return tokenCache;

  try {
    const raw = await readFile(TOKENS_FILE, 'utf-8');
    const data = JSON.parse(raw) as Record<string, TokenInfo>;
    tokenCache = new Map(Object.entries(data));
  } catch {
    tokenCache = new Map();
  }
  return tokenCache;
}

/**
 * Persist the in-memory token cache to disk.
 */
async function saveTokens(): Promise<void> {
  if (!tokenCache) return;
  const obj = Object.fromEntries(tokenCache);
  await writeFile(TOKENS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
}

/**
 * Add a new token to the store.
 */
export async function addToken(token: string, version?: string): Promise<void> {
  const tokens = await loadTokens();
  tokens.set(token, {
    createdAt: new Date().toISOString(),
    version,
  });
  await saveTokens();
}

/**
 * Check if a token exists in the store.
 */
export async function hasToken(token: string): Promise<boolean> {
  const tokens = await loadTokens();
  return tokens.has(token);
}

/**
 * Update the lastUsed timestamp for a token.
 */
export async function touchToken(token: string): Promise<void> {
  const tokens = await loadTokens();
  const info = tokens.get(token);
  if (info) {
    info.lastUsed = new Date().toISOString();
    // Don't save on every touch -- batch save periodically
    // For now, save on each touch (acceptable at low volume)
    await saveTokens();
  }
}
