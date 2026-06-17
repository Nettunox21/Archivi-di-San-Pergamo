import { cookies } from "next/headers";
import { getUsers } from "@/auth/users";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";

const FEEDBACK_FILE = path.join(process.cwd(), "data", "feedback.json");

function loadFeedback() {
    if (!fs.existsSync(FEEDBACK_FILE)) return [];
    const raw = fs.readFileSync(FEEDBACK_FILE, "utf-8");
    return JSON.parse(raw);
}

function saveFeedback(data: object[]) {
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(data, null, 2));
}

async function deleteFeedback(id: number) {
    "use server";
    const feedbacks = loadFeedback();
    const updated = feedbacks.filter((fb: { id: number }) => fb.id !== id);
    saveFeedback(updated);
    revalidatePath("/admin/feedback");
}

export default async function AdminFeedbackPage() {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user")?.value || null;
    const currentUser = getUsers().find((u) => u.username === userCookie) || null;

    if (!currentUser || currentUser.role !== "admin") {
        redirect("/");
    }

    const feedbacks = loadFeedback();

    return (
        <div className="admin-wrapper">
            <a href="/admin" className="admin-back">← Torna al pannello</a>
            <h1 className="admin-title">Revisione Feedback</h1>
            <p className="admin-subtitle">{feedbacks.length} feedback ricevuti</p>

            {feedbacks.length === 0 ? (
                <p className="admin-empty">Nessun feedback ancora.</p>
            ) : (
                <div className="admin-list">
                    {[...feedbacks].reverse().map((fb: {
                        id: number;
                        username: string;
                        tag: string;
                        message: string;
                        date: string;
                    }) => (
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