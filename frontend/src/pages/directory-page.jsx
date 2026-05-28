import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { directoryService } from "../services/interfaces/directory-service";

const DirectoryPage = () => {
  const navigate = useNavigate();

  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadContacts = async () => {
      try {
        const data = await directoryService.getDirectoryContacts();
        setContacts(data);
      } catch (err) {
        console.error("Failed to load directory contacts:", err);
        setError("Failed to load directory contacts.");
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, []);

  const filteredContacts = contacts.filter((contact) => {
    const searchText = searchQuery.toLowerCase();

    return (
      contact.name?.toLowerCase().includes(searchText) ||
      contact.organization?.toLowerCase().includes(searchText) ||
      contact.role?.toLowerCase().includes(searchText) ||
      contact.field?.toLowerCase().includes(searchText) ||
      contact.address?.toLowerCase().includes(searchText)
    );
  });

  if (loading) {
    return (
      <div dir="rtl" style={{ padding: "40px" }}>
        טוען אלפון...
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={{
        padding: "40px",
        width: "100%",
        maxWidth: "1400px",
        margin: "0 auto",
      }}
    >
      <h1
        style={{
          textAlign: "center",
          fontSize: "42px",
          color: "#002b5c",
          marginBottom: "16px",
        }}
      >
        אלפון מעסיקים ורכזים
      </h1>

      <p
        style={{
          textAlign: "center",
          color: "#555",
          fontSize: "18px",
          marginBottom: "32px",
        }}
      >
        כאן ניתן לצפות באנשי קשר, מעסיקים וגורמים רלוונטיים ברשות התעסוקה.
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "36px",
        }}
      >
        <input
          type="text"
          placeholder="חיפוש לפי שם, ארגון, תפקיד, תחום או כתובת..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "650px",
            padding: "14px 18px",
            border: "1px solid #ccc",
            borderRadius: "10px",
            fontSize: "16px",
            background: "#3b3b3b",
            color: "white",
            textAlign: "right",
          }}
        />
      </div>

      {error && (
        <p style={{ color: "red", textAlign: "center", marginBottom: "20px" }}>
          {error}
        </p>
      )}

      {filteredContacts.length === 0 ? (
        <p style={{ textAlign: "center", fontSize: "18px" }}>
          לא נמצאו אנשי קשר להצגה.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px",
            alignItems: "stretch",
            width: "100%",
          }}
        >
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              style={{
                padding: "24px",
                border: "1px solid #ddd",
                borderRadius: "18px",
                background: "#fff",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                minHeight: "260px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h2
                  style={{
                    marginTop: 0,
                    marginBottom: "18px",
                    color: "#002b5c",
                    fontSize: "24px",
                  }}
                >
                  {contact.organization || "לא צוין"}
                </h2>

                <p>
                  <strong>שם:</strong> {contact.name || "לא צוין"}
                </p>

                <p>
                  <strong>תפקיד:</strong> {contact.role || "לא צוין"}
                </p>

                <p>
                  <strong>תחום:</strong> {contact.field || "לא צוין"}
                </p>

                <p>
                  <strong>כתובת:</strong> {contact.address || "לא צוין"}
                </p>
              </div>

              <button
                onClick={() =>
                  navigate(`/directory/${encodeURIComponent(contact.id)}`)
                }
                style={{
                  marginTop: "18px",
                  padding: "11px 18px",
                  border: "none",
                  borderRadius: "999px",
                  background: "#003f9e",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "15px",
                }}
              >
                צפייה בפרופיל
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DirectoryPage;