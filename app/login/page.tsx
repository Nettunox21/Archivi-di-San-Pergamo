"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleLogin() {
        setError("");
        setLoading(true);
        const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });
        setLoading(false);

        if (res.ok) {
            router.push("/");
            router.refresh();
        } else {
            const data = await res.json();
            setError(data.error || "Credenziali errate");
        }
    }

    return (
        <>
            <style>{`
                .login-bg {
                    position: fixed;
                    inset: 0;
                    background-image: url('/login-bg.jpg');
                    background-size: cover;
                    background-position: center;
                    filter: blur(6px) brightness(0.35);
                    transform: scale(1.05);
                    z-index: 0;
                }
                .login-wrapper {
                    position: fixed;
                    inset: 0;
                    z-index: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .login-card {
                    background: rgba(15, 10, 5, 0.82);
                    border: 1px solid rgba(180, 140, 80, 0.3);
                    border-radius: 4px;
                    padding: 48px 44px;
                    width: 100%;
                    max-width: 380px;
                    box-shadow: 0 0 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(180,140,80,0.15);
                }
                .login-title {
                    font-family: 'Palatino Linotype', Palatino, 'Book Antiqua', serif;
                    font-size: 22px;
                    font-weight: 400;
                    color: #c8a96e;
                    text-align: center;
                    margin: 0 0 6px;
                    letter-spacing: 0.04em;
                }
                .login-subtitle {
                    font-size: 12px;
                    color: rgba(180, 150, 100, 0.5);
                    text-align: center;
                    margin: 0 0 36px;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                }
                .login-divider {
                    width: 60px;
                    height: 1px;
                    background: rgba(180, 140, 80, 0.3);
                    margin: 0 auto 32px;
                }
                .login-label {
                    display: block;
                    font-size: 11px;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    color: rgba(180, 150, 100, 0.6);
                    margin-bottom: 8px;
                }
                .login-input {
                    width: 100%;
                    background: rgba(255,255,255,0.04) !important;
                    border: 1px solid rgba(180, 140, 80, 0.2) !important;
                    border-radius: 2px !important;
                    color: #d4b896 !important;
                    font-size: 14px !important;
                    padding: 10px 14px !important;
                    margin-bottom: 20px;
                    outline: none;
                    transition: border-color 0.2s;
                    box-sizing: border-box;
                    font-family: 'Palatino Linotype', Palatino, serif;
                }
                .login-input::placeholder {
                    color: rgba(180, 150, 100, 0.25);
                }
                .login-input:focus {
                    border-color: rgba(180, 140, 80, 0.55) !important;
                    background: rgba(255,255,255,0.07) !important;
                }
                .login-error {
                    font-size: 12px;
                    color: #c0715a;
                    text-align: center;
                    margin-bottom: 16px;
                    letter-spacing: 0.03em;
                }
                .login-btn {
                    width: 100%;
                    padding: 12px;
                    background: transparent;
                    border: 1px solid rgba(180, 140, 80, 0.5);
                    border-radius: 2px;
                    color: #c8a96e;
                    font-family: 'Palatino Linotype', Palatino, serif;
                    font-size: 13px;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    cursor: pointer;
                    transition: background 0.2s, border-color 0.2s;
                }
                .login-btn:hover:not(:disabled) {
                    background: rgba(180, 140, 80, 0.12);
                    border-color: rgba(180, 140, 80, 0.75);
                }
                .login-btn:disabled {
                    opacity: 0.5;
                    cursor: default;
                }
            `}</style>

            <div className="login-bg" />

            <div className="login-wrapper">
                <div className="login-card">
                    <h1 className="login-title">Archivi di San Pergamo</h1>
                    <p className="login-subtitle">Scepter δ-me13</p>
                    <div className="login-divider" />

                    <label className="login-label">Utente</label>
                    <input
                        className="login-input"
                        type="text"
                        placeholder="Il tuo nome"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    />

                    <label className="login-label">Password</label>
                    <input
                        className="login-input"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    />

                    {error && <p className="login-error">{error}</p>}

                    <button
                        className="login-btn"
                        onClick={handleLogin}
                        disabled={loading}
                    >
                        {loading ? "Verifica..." : "Entra nell'archivio"}
                    </button>
                </div>
            </div>
        </>
    );
}