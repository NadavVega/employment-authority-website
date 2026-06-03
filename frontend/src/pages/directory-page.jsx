import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { directoryService } from "../services/interfaces/directory-service";

const isVisibleValue = (value) => {
  return value && value !== "לא צוין" && String(value).trim() !== "";
};

const displayRole = (role) => {
  if (role === "employer") return "מעסיק";
  if (role === "coordinator") return "רכז";
  if (role === "admin") return "מנהלת";
  return role || "";
};

const DirectoryPage = () => {
  const navigate = useNavigate();

  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [fieldFilter, setFieldFilter] = useState("all");
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

  const availableFields = useMemo(() => {
    const fields = contacts
      .map((contact) => contact.field)
      .filter(isVisibleValue);

    return [...new Set(fields)].sort();
  }, [contacts]);

  const filteredContacts = contacts.filter((contact) => {
    const searchText = searchQuery.toLowerCase().trim();

    const matchesSearch =
      !searchText ||
      contact.name?.toLowerCase().includes(searchText) ||
      contact.organization?.toLowerCase().includes(searchText) ||
      contact.role?.toLowerCase().includes(searchText) ||
      displayRole(contact.role).toLowerCase().includes(searchText) ||
      contact.field?.toLowerCase().includes(searchText) ||
      contact.address?.toLowerCase().includes(searchText);

    const matchesRole = roleFilter === "all" || contact.role === roleFilter;

    const matchesField = fieldFilter === "all" || contact.field === fieldFilter;

    return matchesSearch && matchesRole && matchesField;
  });

  if (loading) {
    return (
      <div
        dir="rtl"
        style={{
          padding: "40px",
          fontFamily: '"Assistant", "Heebo", "Arial", sans-serif',
        }}
      >
        טוען אלפון...
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={{
        padding: "32px",
        width: "100%",
        maxWidth: "1500px",
        margin: "0 auto",
        fontFamily: '"Assistant", "Heebo", "Arial", sans-serif',
      }}
    >
      <h1
        style={{
          textAlign: "center",
          fontSize: "42px",
          color: "#002b5c",
          marginBottom: "12px",
          fontWeight: 700,
        }}
      >
        אלפון מעסיקים ורכזים
      </h1>

      <p
        style={{
          textAlign: "center",
          color: "#555",
          fontSize: "18px",
          marginBottom: "28px",
        }}
      >
        כאן ניתן לצפות באנשי קשר, מעסיקים וגורמים רלוונטיים ברשות התעסוקה.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(260px, 2fr) minmax(160px, 1fr) minmax(180px, 1fr)",
          gap: "14px",
          alignItems: "center",
          margin: "0 auto 28px auto",
          maxWidth: "950px",
        }}
      >
        <input
          type="text"
          placeholder="חיפוש לפי שם, ארגון, תפקיד, תחום או כתובת..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "14px 18px",
            border: "2px solid #d6dce5",
            borderRadius: "12px",
            fontSize: "16px",
            background: "#ffffff",
            color: "#1f2937",
            textAlign: "right",
            outline: "none",
            boxShadow: "0 3px 10px rgba(0, 43, 92, 0.08)",
            fontFamily: "inherit",
          }}
        />

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{
            width: "100%",
            padding: "14px 16px",
            border: "2px solid #d6dce5",
            borderRadius: "12px",
            fontSize: "15px",
            background: "#ffffff",
            color: "#1f2937",
            outline: "none",
            boxShadow: "0 3px 10px rgba(0, 43, 92, 0.08)",
            fontFamily: "inherit",
          }}
        >
          <option value="all">כל הסוגים</option>
          <option value="employer">מעסיקים</option>
          <option value="coordinator">רכזים</option>
        </select>

        <select
          value={fieldFilter}
          onChange={(e) => setFieldFilter(e.target.value)}
          style={{
            width: "100%",
            padding: "14px 16px",
            border: "2px solid #d6dce5",
            borderRadius: "12px",
            fontSize: "15px",
            background: "#ffffff",
            color: "#1f2937",
            outline: "none",
            boxShadow: "0 3px 10px rgba(0, 43, 92, 0.08)",
            fontFamily: "inherit",
          }}
        >
          <option value="all">כל התחומים</option>
          {availableFields.map((field) => (
            <option key={field} value={field}>
              {field}
            </option>
          ))}
        </select>
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
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "18px",
            alignItems: "stretch",
            width: "100%",
          }}
        >
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              style={{
                padding: "20px",
                border: "1px solid #dde3ec",
                borderRadius: "18px",
                background: "#fff",
                boxShadow: "0 4px 12px rgba(0,0,0,0.07)",
                minHeight: "210px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                {isVisibleValue(contact.organization) && (
                  <h2
                    style={{
                      marginTop: 0,
                      marginBottom: "14px",
                      color: "#002b5c",
                      fontSize: "22px",
                      fontWeight: 700,
                    }}
                  >
                    {contact.organization}
                  </h2>
                )}

                {isVisibleValue(contact.name) && (
                  <p style={{ margin: "7px 0", fontSize: "16px" }}>
                    <strong>שם:</strong> {contact.name}
                  </p>
                )}

                {isVisibleValue(contact.role) && (
                  <p style={{ margin: "7px 0", fontSize: "16px" }}>
                    <strong>תפקיד:</strong> {displayRole(contact.role)}
                  </p>
                )}

                {isVisibleValue(contact.field) && (
                  <p style={{ margin: "7px 0", fontSize: "16px" }}>
                    <strong>תחום:</strong> {contact.field}
                  </p>
                )}

                {isVisibleValue(contact.address) && (
                  <p style={{ margin: "7px 0", fontSize: "16px" }}>
                    <strong>כתובת:</strong> {contact.address}
                  </p>
                )}
              </div>

              <button
                onClick={() =>
                  navigate(`/directory/${encodeURIComponent(contact.id)}`)
                }
                style={{
                  marginTop: "16px",
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: "999px",
                  background: "#003f9e",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "15px",
                  fontFamily: "inherit",
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