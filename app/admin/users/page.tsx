"use client";
import { useState, useEffect } from "react";

type User = {
    username: string;
    role: string;
    avatar: string;
};

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [editing, setEditing] = useState<{ [key: string]: { username: string; password: string } }>({});
    const [messages, setMessages] = useState<{ [key: string]: string }>({});
    const [nuovo, setNuovo] = useState({ username: "", password: "", role: "user", avatar: "" });
    const [nuovoMsg, setNuovoMsg] = useState("");

    useEffect(() => {
        fetch("/api/users", { credentials: "include" })
            .then((r) => r.json())
            .then(setUsers);
    }, []);

    function handleChange(original: string, field: "username" | "password", value: string) {
        setEditing((prev) => ({
            ...prev,
            [original]: {
                ...prev[original],
                [field]: value,
            },
        }));
    }

    async function handleSave(originalUsername: string) {
        const changes = editing[originalUsername];
        if (!changes) return;

        const res = await fetch("/api/users", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                targetUsername: originalUsername,
                newUsername: changes.username || originalUsername,
                newPassword: changes.password || "",
            }),
        });

        if (res.ok) {
            setMessages((prev) => ({ ...prev, [originalUsername]: "Salvato!" }));
            const updated = await fetch("/api/users", { credentials: "include" }).then((r) => r.json());
            setUsers(updated);
            setEditing((prev) => ({ ...prev, [originalUsername]: { username: "", password: "" } }));
        } else {
            const data = await res.json();
            setMessages((prev) => ({ ...prev, [originalUsername]: data.error || "Errore" }));
        }

        setTimeout(() => {
            setMessages((prev) => ({ ...prev, [originalUsername]: "" }));
        }, 3000);
    }

    async function handleCreate() {
        const res = await fetch("/api/users", {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nuovo),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
            setNuovoMsg("Utente creato!");
            setNuovo({ username: "", password: "", role: "user", avatar: "" });
            const updated = await fetch("/api/users", { credentials: "include" }).then((r) => r.json());
            setUsers(updated);
        } else {
            setNuovoMsg(data.error || "Errore");
        }
        setTimeout(() => setNuovoMsg(""), 4000);
    }

    return (
        <div className="admin-wrapper">
            <a href="/admin" className="admin-back">← Torna al pannello</a>
            <h1 className="admin-title">Gestione Utenti</h1>
            <p className="admin-subtitle">{users.length} utenti registrati</p>

            <div className="admin-card" style={{ marginBottom: 24 }}>
                <div className="admin-card-header"><span className="admin-tag">Nuovo utente</span></div>
                <div className="admin-user-fields">
                    <div className="admin-user-field">
                        <label className="admin-user-label">Username</label>
                        <input className="admin-user-input" type="text" value={nuovo.username} onChange={(e) => setNuovo({ ...nuovo, username: e.target.value })} />
                    </div>
                    <div className="admin-user-field">
                        <label className="admin-user-label">Password (min. 6)</label>
                        <input className="admin-user-input" type="text" value={nuovo.password} onChange={(e) => setNuovo({ ...nuovo, password: e.target.value })} />
                    </div>
                    <div className="admin-user-field">
                        <label className="admin-user-label">Avatar (percorso, facoltativo)</label>
                        <input className="admin-user-input" type="text" placeholder="/avatars/nome.png" value={nuovo.avatar} onChange={(e) => setNuovo({ ...nuovo, avatar: e.target.value })} />
                    </div>
                    <div className="admin-user-field">
                        <label className="admin-user-label">Ruolo</label>
                        <select className="admin-user-input" value={nuovo.role} onChange={(e) => setNuovo({ ...nuovo, role: e.target.value })}>
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                        </select>
                    </div>
                    <button className="admin-user-save-btn" disabled={!nuovo.username || nuovo.password.length < 6} onClick={handleCreate}>Crea</button>
                </div>
                {nuovoMsg && <p className="admin-user-message">{nuovoMsg}</p>}
            </div>

            <div className="admin-list">
                {users.map((user) => (
                    <div key={user.username} className="admin-card">
                        <div className="admin-card-header">
                            <span className="admin-tag">{user.role}</span>
                            <span className="admin-user">{user.username}</span>
                        </div>
                        <div className="admin-user-fields">
                            <div className="admin-user-field">
                                <label className="admin-user-label">Nuovo username</label>
                                <input
                                    className="admin-user-input"
                                    type="text"
                                    placeholder={user.username}
                                    value={editing[user.username]?.username || ""}
                                    onChange={(e) => handleChange(user.username, "username", e.target.value)}
                                />
                            </div>
                            <div className="admin-user-field">
                                <label className="admin-user-label">Nuova password</label>
                                <input
                                    className="admin-user-input"
                                    type="text"
                                    placeholder="••••••••"
                                    value={editing[user.username]?.password || ""}
                                    onChange={(e) => handleChange(user.username, "password", e.target.value)}
                                />
                            </div>
                            <button
                                className="admin-user-save-btn"
                                onClick={() => handleSave(user.username)}
                            >
                                Salva
                            </button>
                        </div>
                        {messages[user.username] && (
                            <p className="admin-user-message">{messages[user.username]}</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
