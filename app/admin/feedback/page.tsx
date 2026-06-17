import { cookies } from "next/headers";
import { getUsers } from "@/auth/users";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function deleteFeedback(id: number) {
    "use server";
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user")?.value || null;

    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/feedback`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "Cookie": `user=${userCookie}` },
        body: JSON.stringify({ id }),
    });
    revalidatePath("/admin/feedback");
}

export default async function AdminFeedbackPage() {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user")?.value || null;
    const currentUser = getUsers().find((u) => u.username === userCookie) || null;

    if (!currentUser || currentUser.role !== "admin") {
        redirect("/");
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/feedback`, {
        headers: { "Cookie": `user=${userCookie}` },
        cache: "no-store",
    });
    const feedbacks: { id: number; username: string; tag: string; message: string; date: string }[] =
        res.ok ? await res.json() : [];

    return (
        <div className="admin-wrapper">
            <a href="/admin" className="admin-back">← Torna al pannello</a>
            <h1 className="admin-title">Revisione Feedback</h1>
            <p className="admin-subtitle">{feedbacks.length} feedback ricevuti</p>

            {feedbacks.length === 0 ? (
                <p className="admin-empty">Nessun feedback ancora.</p>
            ) : (
                <div className="admin-list">
                    {feedbacks.map((fb) => (
                        <div key={fb.id} className="admin-card">
                            <div className="admin-card-header">
                                <span className="admin-tag">{fb.tag}</span>
                                <span className="admin-user">{fb.username}</span>
                                <span className="admin-date">
                                    {new Date(fb.date).toLocaleString("it-IT")}
                                </span>
                                <form action={deleteFeedback.bind(null, fb.id)}>
                                    <button type="submit" className="admin-delete-btn">
                                        Elimina
                                    </button>
                                </form>
                            </div>
                            <p className="admin-message">{fb.message}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
