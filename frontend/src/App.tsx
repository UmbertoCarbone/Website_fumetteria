import { useState } from "react";
import Login from "./components/Login";

function App() {
  const [role, setRole] = useState<string | null>(null);

  const handleLogout = () => {
    setRole(null);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>{role ? `Benvenuto ${role}` : "Effettua il Login"}</h1>

      {!role ? (
        <Login onLogin={(r) => setRole(r)} />
      ) : (
        <>
          <button onClick={handleLogout} style={{ marginBottom: "20px" }}>
            Logout
          </button>

          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            {/* Bottone Base: Visibile a tutti i ruoli */}
            <button>Bottone Base</button>

            {/* Bottone Staff: Visibile solo a STAFF e SUPERADMIN */}
            {(role === "STAFF" || role === "SUPERADMIN") && (
              <button style={{ backgroundColor: "#fff3cd" }}>
                Bottone Staff
              </button>
            )}

            {/* Bottone Admin: Visibile solo a SUPERADMIN */}
            {role === "SUPERADMIN" && (
              <button style={{ backgroundColor: "#f8d7da" }}>
                Bottone Admin
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
