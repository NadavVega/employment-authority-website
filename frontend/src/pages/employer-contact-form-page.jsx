import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import { directoryService } from "../services/interfaces/directory-service";

import "../design/global-theme.css";

const emptyForm = {
  company: "",
  fullName: "",
  address: "",
  email: "",
  phone: "",
  field: "",
  subField: "",
  status: "",
  companyId: "",
  companyDescription: "",
  jobsUrl: "",
  lastContactNote: "",
  lastContactDate: "",
};

const EmployerContactFormPage = () => {
  const navigate = useNavigate();
  const { employerId } = useParams();
  const { currentUser, userRole } = useAuth();

  const isEditMode = Boolean(employerId);

  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const isCoordinator = userRole === "coordinator";

  useEffect(() => {
    const loadEmployerForEdit = async () => {
      if (!isEditMode) return;

      setLoading(true);
      setMessage("");

      try {
        const employer = await directoryService.getDirectoryContactById(
          employerId
        );

        if (!employer) {
          setMessage("המעסיק לא נמצא.");
          return;
        }

        const assignedCoordinatorEmail = employer.assignedCoordinatorEmail
          ? employer.assignedCoordinatorEmail.toLowerCase().trim()
          : "";

        const currentUserEmail = currentUser?.email
          ? currentUser.email.toLowerCase().trim()
          : "";

        if (
          employer.role !== "employer" ||
          assignedCoordinatorEmail !== currentUserEmail
        ) {
          setMessage("אין לך הרשאה לערוך את המעסיק הזה.");
          return;
        }

        // --- התיקון שלנו: משיכת הטלפון מהפרטים החסויים (private_info) ---
        let privatePhone = employer.phone || ""; 
        try {
          const privateInfo = await directoryService.getPrivateContactInfo(employer.email);
          if (privateInfo && privateInfo.phone) {
            privatePhone = privateInfo.phone;
          }
        } catch (err) {
          console.warn("Failed to load private phone:", err);
        }
        // ---------------------------------------------------------------

        setFormData({
          company: employer.organization || "",
          fullName: employer.name || "",
          address: employer.address || "",
          email: employer.email || "",
          phone: privatePhone, // כאן אנחנו מאכלסים את הטלפון שמצאנו
          field: employer.field || "",
          subField: employer.subField || "",
          status: employer.status || "",
          companyId: employer.companyId || "",
          companyDescription: employer.companyDescription || "",
          jobsUrl: employer.jobsUrl || "",
          lastContactNote: employer.lastContactNote || "",
          lastContactDate: employer.lastContactDate || "",
        });
      } catch (error) {
        console.error("Failed to load employer for edit:", error);
        setMessage("טעינת פרטי המעסיק נכשלה.");
      } finally {
        setLoading(false);
      }
    };

    loadEmployerForEdit();
  }, [isEditMode, employerId, currentUser]);

  const handleChange = (fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const validateRequiredFields = () => {
    if (!formData.company.trim()) return "שם חברה הוא שדה חובה.";
    if (!formData.address.trim()) return "כתובת חברה היא שדה חובה.";
    if (!isEditMode && !formData.email.trim()) return "אימייל הוא שדה חובה.";
    if (!formData.phone.trim()) return "טלפון הוא שדה חובה.";
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!isCoordinator) {
      setMessage("רק רכז יכול להוסיף או לערוך מעסיקים.");
      return;
    }

    const validationError = validateRequiredFields();

    if (validationError) {
      setMessage(validationError);
      return;
    }

    setSaving(true);

    try {
      if (isEditMode) {
        await directoryService.updateAssignedEmployerContact(
          currentUser,
          employerId,
          formData
        );

        navigate(`/directory/${encodeURIComponent(employerId)}`);
      } else {
        const result = await directoryService.createEmployerContact(
          currentUser,
          formData
        );

        navigate(`/directory/${encodeURIComponent(result.id)}`);
      }
    } catch (error) {
      console.error("Failed to save employer contact:", error);
      setMessage(error.message || "שמירת פרטי המעסיק נכשלה.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #d6dce5",
    borderRadius: "10px",
    fontSize: "15px",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "6px",
    fontWeight: 700,
    color: "#002b5c",
  };

  const fieldWrapperStyle = {
    marginBottom: "16px",
  };

  if (loading) {
    return (
      <div dir="rtl" style={{ padding: "40px" }}>
        טוען טופס...
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={{
        padding: "40px",
        maxWidth: "900px",
        margin: "0 auto",
        fontFamily: '"Assistant", "Heebo", "Arial", sans-serif',
      }}
    >
      <h1 style={{ color: "#002b5c", fontSize: "36px", marginBottom: "10px" }}>
        {isEditMode ? "עריכת פרטי מעסיק" : "הוספת מעסיק חדש"}
      </h1>

      <p style={{ color: "#555", marginBottom: "28px" }}>
        שדות חובה: שם חברה, כתובת חברה, אימייל וטלפון.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          background: "#fff",
          border: "1px solid #dde3ec",
          borderRadius: "16px",
          padding: "28px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.07)",
        }}
      >
        <div style={fieldWrapperStyle}>
          <label style={labelStyle}>שם חברה *</label>
          <input
            style={inputStyle}
            value={formData.company}
            onChange={(e) => handleChange("company", e.target.value)}
          />
        </div>

        <div style={fieldWrapperStyle}>
          <label style={labelStyle}>שם איש קשר</label>
          <input
            style={inputStyle}
            value={formData.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
          />
        </div>

        <div style={fieldWrapperStyle}>
          <label style={labelStyle}>כתובת חברה *</label>
          <input
            style={inputStyle}
            value={formData.address}
            onChange={(e) => handleChange("address", e.target.value)}
          />
        </div>

        <div style={fieldWrapperStyle}>
          <label style={labelStyle}>אימייל *</label>
          <input
            style={{
              ...inputStyle,
              direction: "ltr",
              background: isEditMode ? "#f3f4f6" : "#fff",
            }}
            type="email"
            value={formData.email}
            disabled={isEditMode}
            onChange={(e) => handleChange("email", e.target.value)}
          />
        </div>

        <div style={fieldWrapperStyle}>
          <label style={labelStyle}>טלפון *</label>
          <input
            style={{ ...inputStyle, direction: "ltr" }}
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
          />
        </div>

        <div style={fieldWrapperStyle}>
          <label style={labelStyle}>תחום</label>
          <input
            style={inputStyle}
            value={formData.field}
            onChange={(e) => handleChange("field", e.target.value)}
          />
        </div>

        <div style={fieldWrapperStyle}>
          <label style={labelStyle}>תת־תחום</label>
          <input
            style={inputStyle}
            value={formData.subField}
            onChange={(e) => handleChange("subField", e.target.value)}
          />
        </div>

        <div style={fieldWrapperStyle}>
          <label style={labelStyle}>סטטוס קשר</label>
          <input
            style={inputStyle}
            value={formData.status}
            onChange={(e) => handleChange("status", e.target.value)}
          />
        </div>

        <div style={fieldWrapperStyle}>
          <label style={labelStyle}>ח.פ / מזהה חברה</label>
          <input
            style={{ ...inputStyle, direction: "ltr" }}
            value={formData.companyId}
            onChange={(e) => handleChange("companyId", e.target.value)}
          />
        </div>

        <div style={fieldWrapperStyle}>
          <label style={labelStyle}>תיאור חברה</label>
          <textarea
            style={{ ...inputStyle, minHeight: "90px" }}
            value={formData.companyDescription}
            onChange={(e) =>
              handleChange("companyDescription", e.target.value)
            }
          />
        </div>

        <div style={fieldWrapperStyle}>
          <label style={labelStyle}>קישור לעמוד משרות</label>
          <input
            style={{ ...inputStyle, direction: "ltr" }}
            value={formData.jobsUrl}
            onChange={(e) => handleChange("jobsUrl", e.target.value)}
          />
        </div>

        <div style={fieldWrapperStyle}>
          <label style={labelStyle}>תיעוד קשר אחרון</label>
          <textarea
            style={{ ...inputStyle, minHeight: "90px" }}
            value={formData.lastContactNote}
            onChange={(e) => handleChange("lastContactNote", e.target.value)}
          />
        </div>

        <div style={fieldWrapperStyle}>
          <label style={labelStyle}>תאריך קשר אחרון</label>
          <input
            style={inputStyle}
            type="date"
            value={formData.lastContactDate}
            onChange={(e) => handleChange("lastContactDate", e.target.value)}
          />
        </div>

        {message && (
          <p style={{ marginTop: "10px", color: "#b00020", fontWeight: 700 }}>
            {message}
          </p>
        )}

        <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "11px 20px",
              border: "none",
              borderRadius: "999px",
              background: "#003f9e",
              color: "#fff",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
              fontWeight: 700,
              fontFamily: "inherit",
            }}
          >
            {saving ? "שומר..." : isEditMode ? "שמירת שינויים" : "הוספת מעסיק"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/directory")}
            style={{
              padding: "11px 20px",
              border: "1px solid #d6dce5",
              borderRadius: "999px",
              background: "#fff",
              color: "#002b5c",
              cursor: "pointer",
              fontWeight: 700,
              fontFamily: "inherit",
            }}
          >
            ביטול
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployerContactFormPage;