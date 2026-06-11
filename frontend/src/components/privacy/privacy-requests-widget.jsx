import React, { useEffect, useState } from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import { useAuth } from "../../context/auth-context";
import { privacyService } from "../../services/interfaces/privacy-service";

const PrivacyRequestsWidget = () => {
  const { currentUser, userRole } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [message, setMessage] = useState("");

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await privacyService.getActionablePrivacyRequests(
        currentUser,
        userRole
      );
      setRequests(data);
    } catch (error) {
      console.error("Failed to load privacy requests:", error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser?.email || !userRole) {
      setLoading(false);
      return;
    }

    loadRequests();
  }, [currentUser?.email, userRole]);

  const handleApprove = async (request) => {
    setActionLoadingId(request.id);
    setMessage("");

    try {
      await privacyService.approvePrivacyRequest(request, currentUser);
      setMessage("הבקשה אושרה בהצלחה.");
      await loadRequests();
    } catch (error) {
      console.error("Failed to approve privacy request:", error);
      setMessage(error.message || "אישור הבקשה נכשל.");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleReject = async (request) => {
    setActionLoadingId(request.id);
    setMessage("");

    try {
      await privacyService.rejectPrivacyRequest(request, currentUser);
      setMessage("הבקשה נדחתה.");
      await loadRequests();
    } catch (error) {
      console.error("Failed to reject privacy request:", error);
      setMessage(error.message || "דחיית הבקשה נכשלה.");
    } finally {
      setActionLoadingId("");
    }
  };

  if (loading || requests.length === 0) {
    return null;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 4,
        p: 3,
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border)",
        bgcolor: "var(--color-surface)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
        direction: "rtl",
      }}
    >
      <Typography
        variant="h5"
        fontWeight="700"
        sx={{ color: "var(--color-primary-dark)", mb: 2 }}
      >
        בקשות גישה שממתינות לטיפולך
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {requests.map((request) => (
          <Box
            key={request.id}
            sx={{
              p: 2,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              bgcolor: "#fff",
            }}
          >
            <Typography fontWeight="700" sx={{ mb: 1 }}>
              {userRole === "employer"
                ? "רכז מבקש גישה לפרטי הקשר שלך"
                : "בקשת גישה למעסיק המשויך אליך"}
            </Typography>

            <Typography variant="body2">
              <strong>מבקש:</strong> {request.requesterEmail}
            </Typography>

            <Typography variant="body2">
              <strong>מעסיק:</strong>{" "}
              {request.targetEmployerName || request.targetEmail}
            </Typography>

            {request.requiresCoordinatorApproval && (
              <Typography variant="body2" sx={{ color: "#8a5a00", mt: 1 }}>
                בקשה זו דורשת אישור מעסיק וגם אישור רכז משויך.
              </Typography>
            )}

            <Box sx={{ display: "flex", gap: 1.5, mt: 2 }}>
              <Button
                variant="contained"
                disabled={actionLoadingId === request.id}
                onClick={() => handleApprove(request)}
              >
                אישור גישה
              </Button>

              <Button
                variant="outlined"
                color="error"
                disabled={actionLoadingId === request.id}
                onClick={() => handleReject(request)}
              >
                דחייה
              </Button>
            </Box>
          </Box>
        ))}
      </Box>

      {message && (
        <Typography sx={{ mt: 2, fontWeight: 700 }}>{message}</Typography>
      )}
    </Paper>
  );
};

export default PrivacyRequestsWidget;