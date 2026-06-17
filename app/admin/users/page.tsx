"use client";
import { useState, useEffect } from "react";

type User = {
    username: string;
    password: string;
    role: string;
    avatar: string;
};

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [editing, setEditing] = useState<{ [key: string]: { username: string; password: string } }>({});
    const [messages, setMessages] = useState<{ [key: string]: string }>({});

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

    return (
        <div className="admin-wrapper">
            <a href="/admin" className="admin-back">← Torna al pannello</a>
            <h1 className="admin-title">Gestione Utenti</h1>
            <p className="admin-subtitle">{users.length} utenti registrati</p>

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