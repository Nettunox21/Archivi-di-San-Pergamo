import { currentUser } from "@/auth/users";

export default function Navbar() {
  return (
    <nav style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 20px",
      borderBottom: "1px solid #ddd"
    }}>
      
      {/* LOGO / TITOLO */}
      <div style={{ fontWeight: "bold" }}>
        Archivi San Pergamo
      </div>

      {/* USER */}
      {currentUser && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}>
          <span>{currentUser.username}</span>

          <img
            src={currentUser.avatar}
            alt="avatar"
            width={32}
            height={32}
            style={{
              borderRadius: "50%",
              objectFit: "cover"
            }}
          />
        </div>
      )}
    </nav>
  );
}