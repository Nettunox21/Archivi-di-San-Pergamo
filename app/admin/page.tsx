import { cookies } from "next/headers";
import { getUsers } from "@/auth/users";
import { redirect } from "next/navigation";
import Link from "next/link";

const adminSections = [
    {
        title: "Revisione Feedback",
        image: "/images/admin-feedback.jpeg",
        href: "/admin/feedback",
    },
    {
        title: "Gestione utenti",
        image: "/images/admin-placeholder.jpeg",
        href: "/admin/users",
    },
    {
        title: "Gestione mappa",
        image: "/images/admin-placeholder.jpeg",
        href: "/admin/map",
    },
    {
        title: "Scepter δ-me13",
        image: "/images/admin-placeholder.jpeg",
        href: "#",
    },
    {
        title: "Scepter δ-me13",
        image: "/images/admin-placeholder.jpeg",
        href: "#",
    },
    {
        title: "Scepter δ-me13",
        image: "/images/admin-placeholder.jpeg",
        href: "#",
    },
];

export default async function AdminPage() {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user")?.value || null;
    const currentUser = getUsers().find((u) => u.username === userCookie) || null;

    if (!currentUser || currentUser.role !== "admin") {
        redirect("/");
    }

    return (
        <div className="admin-dashboard-wrapper">
            <h1 className="admin-title">Pannello Admin</h1>
            <p className="admin-subtitle">Benvenuto, {currentUser.username}</p>
            <div className="admin-dashboard-grid">
                {adminSections.map((section, i) => (
                    <Link key={i} href={section.href} className="admin-dashboard-card" style={{ backgroundImage: `url('${section.image}')` }}>
                        <div className="admin-dashboard-overlay" />
                        <span className="admin-dashboard-title">{section.title}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}