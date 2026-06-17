import fs from "fs";
import path from "path";

const USERS_SEED = path.join(process.cwd(), "data", "users.json");
const USERS_TMP = path.join("/tmp", "users.json");

export function getUsers() {
    // Prefer /tmp (where admin edits are written), fall back to bundled seed
    const file = fs.existsSync(USERS_TMP) ? USERS_TMP : USERS_SEED;
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw) as {
        username: string;
        password: string;
        role: string;
        avatar: string;
    }[];
}
