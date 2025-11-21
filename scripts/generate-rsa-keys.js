#!/usr/bin/env bun
/**
 * Generate RSA Key Pair for JWT Asymmetric Encryption
 * Alternative to shell script for cross-platform support
 */

import { writeFileSync, mkdirSync, chmodSync } from 'fs';
import { generateKeyPairSync } from 'crypto';

const KEYS_DIR = 'keys';
const PRIVATE_KEY_FILE = `${KEYS_DIR}/jwt-private.pem`;
const PUBLIC_KEY_FILE = `${KEYS_DIR}/jwt-public.pem`;

console.log('Generating RSA key pair for JWT authentication...');

// Create keys directory if it doesn't exist
mkdirSync(KEYS_DIR, { recursive: true });

// Generate RSA key pair (2048 bits)
console.log('Generating key pair...');
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
});

// Write keys to files
writeFileSync(PRIVATE_KEY_FILE, privateKey);
writeFileSync(PUBLIC_KEY_FILE, publicKey);

// Set appropriate permissions (Unix-like systems)
try {
  chmodSync(PRIVATE_KEY_FILE, 0o600); // Private key: read/write for owner only
  chmodSync(PUBLIC_KEY_FILE, 0o644); // Public key: readable by all
} catch (error) {
  // Windows doesn't support chmod, that's okay
  console.warn('Could not set file permissions (this is normal on Windows)');
}

console.log('✅ RSA key pair generated successfully!');
console.log('');
console.log(`Private key: ${PRIVATE_KEY_FILE}`);
console.log(`Public key:  ${PUBLIC_KEY_FILE}`);
console.log('');
console.log('⚠️  IMPORTANT:');
console.log('   - Keep the private key secure and never commit it to version control');
console.log('   - The public key can be shared with all services');
console.log('   - Add keys/ directory to .gitignore');
console.log('');
console.log('To use in environment variables:');
console.log(`   JWT_PRIVATE_KEY=$(cat ${PRIVATE_KEY_FILE})`);
console.log(`   JWT_PUBLIC_KEY=$(cat ${PUBLIC_KEY_FILE})`);

