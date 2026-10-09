import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

/** Formato: scrypt1$<salt hex>$<hash hex> */
export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16);
    const hash = await scrypt(password, salt, 64);
    return `scrypt1$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verificaPassword(password: string, stored: string): Promise<boolean> {
    const [tag, saltHex, hashHex] = stored.split("$");
    if (tag !== "scrypt1" || !saltHex || !hashHex) return false;
    const expected = Buffer.from(hashHex, "hex");
    const got = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
    return got.length === expected.length && timingSafeEqual(got, expected);
}
