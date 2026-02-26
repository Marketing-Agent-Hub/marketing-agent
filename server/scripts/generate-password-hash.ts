/**
 * Utility script to generate bcrypt password hash
 * Usage: tsx scripts/generate-password-hash.ts <password>
 */
import bcrypt from 'bcrypt';

const password = process.argv[2];

if (!password) {
    console.error('Usage: tsx scripts/generate-password-hash.ts <password>');
    process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
console.log('Password hash:');
console.log(hash);
