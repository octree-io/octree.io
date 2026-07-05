import { hash, verify } from "@node-rs/argon2";

// @node-rs/argon2 defaults to argon2id with OWASP-sane cost parameters and
// ships prebuilt binaries (no node-gyp). Salting is handled internally.
export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(
  storedHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(storedHash, password);
  } catch {
    // Malformed hash / mismatch — treat as a failed login rather than a 500.
    return false;
  }
}
