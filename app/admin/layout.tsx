import { redirect } from "next/navigation";
import { getCurrentUser } from "@/auth/users";

// Protegge TUTTE le pagine sotto /admin: chi non è admin torna alla home.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") redirect("/");
    return <>{children}</>;
}
