import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  onSnapshot,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase/config";
import {
  createPrivateDetailsCoordinatorApprovalNotification,
  createPrivateDetailsRequestNotification,
} from "./notification-service";

const getUserProfileByEmail = async (email) => {
  if (!email) {
    return {};
  }

  const normalizedEmail = email.toLowerCase().trim();
  const userRef = doc(db, "users", normalizedEmail);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return {};
  }

  const data = userSnap.data();
  const profile = data.profile || {};

  return {
    fullName: profile.fullName || data.fullName || "",
    centerName:
      profile.centerName ||
      data.centerName ||
      profile.center ||
      data.center ||
      profile.organization ||
      data.organization ||
      "",
    phone: profile.phone || data.phone || profile.mobile || data.mobile || "",
    role: data.role || profile.role || "",
    email: normalizedEmail,
  };
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const normalizeValue = (value) => String(value || "").trim().toLowerCase();

const getPublicUserByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return {};
  }

  const userSnap = await getDoc(doc(db, "users", normalizedEmail));

  if (!userSnap.exists()) {
    return {};
  }

  return {
    id: userSnap.id,
    ...userSnap.data(),
    email: normalizedEmail,
  };
};

const getAssignedCoordinatorEmail = (employer) => {
  return normalizeEmail(
    employer?.assignedCoordinatorEmail ||
      employer?.profile?.assignedCoordinatorEmail
  );
};

const noop = () => {};

const mapPrivacyRequestDoc = (docSnap) => {
  const data = docSnap.data();

  return {
    id: docSnap.id,

    requesterEmail: data.requesterEmail || "",
    requesterName: data.requesterName || "",
    requesterCenterName: data.requesterCenterName || "",
    requesterPhone: data.requesterPhone || "",
    requesterRole: data.requesterRole || "",

    targetEmail: data.targetEmail || "",
    targetEmployerName: data.targetEmployerName || "",
    targetEmployerContactName: data.targetEmployerContactName || "",
    targetEmployerRole: data.targetEmployerRole || "",

    assignedCoordinatorEmail: data.assignedCoordinatorEmail || "",
    targetAssignedCoordinatorEmail:
      data.targetAssignedCoordinatorEmail || data.assignedCoordinatorEmail || "",
    requiresCoordinatorApproval: data.requiresCoordinatorApproval === true,

    employerApprovalStatus: data.employerApprovalStatus || "pending",
    coordinatorApprovalStatus: data.coordinatorApprovalStatus || "pending",

    status: data.status || "pending",

    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,

    employerReviewedAt: data.employerReviewedAt || null,
    employerReviewedBy: data.employerReviewedBy || null,

    coordinatorReviewedAt: data.coordinatorReviewedAt || null,
    coordinatorReviewedBy: data.coordinatorReviewedBy || null,

    reviewedAt: data.reviewedAt || null,
    reviewedBy: data.reviewedBy || null,
  };
};

const isPendingCoordinatorApproval = (request, currentUserEmail) => {
  const assignedEmail = normalizeEmail(
    request.targetAssignedCoordinatorEmail || request.assignedCoordinatorEmail
  );
  const requesterEmail = normalizeEmail(request.requesterEmail);
  const status = String(request.status || "").toLowerCase();
  const coordinatorApprovalStatus = String(
    request.coordinatorApprovalStatus || ""
  ).toLowerCase();

  return (
    assignedEmail === currentUserEmail &&
    requesterEmail !== currentUserEmail &&
    !["approved", "rejected", "denied", "cancelled", "completed"].includes(
      status
    ) &&
    coordinatorApprovalStatus === "pending"
  );
};

const isPrivacyRequestFullyApproved = (requestData) => {
  return (
    requestData.employerApprovalStatus === "approved" &&
    requestData.coordinatorApprovalStatus === "approved"
  );
};

const createPrivateAccessGrant = (requestId, requestData, batch) => {
  const targetEmail = normalizeEmail(requestData.targetEmail);
  const requesterEmail = normalizeEmail(requestData.requesterEmail);
  const assignedCoordinatorEmail = normalizeEmail(
    requestData.assignedCoordinatorEmail ||
      requestData.targetAssignedCoordinatorEmail
  );

  if (!requestId || !targetEmail || !requesterEmail) {
    throw new Error("Private access grant details are incomplete.");
  }

  if (!isPrivacyRequestFullyApproved(requestData)) {
    throw new Error("Private access can be granted only after full approval.");
  }

  const privateAccessRef = doc(
    db,
    "users",
    targetEmail,
    "private_access",
    requesterEmail
  );

  batch.set(
    privateAccessRef,
    {
      sourceRequestId: requestId,
      targetEmail,
      requesterEmail,
      assignedCoordinatorEmail,
      employerApprovalStatus: "approved",
      coordinatorApprovalStatus: "approved",
      grantedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const privacyService = {
  async requestContactAccess(currentUser, targetEmployer) {
    if (!currentUser?.email) {
      throw new Error("User must be logged in to request access.");
    }

    if (!targetEmployer?.email) {
      throw new Error("Target employer email is missing.");
    }

    const requesterEmail = normalizeEmail(currentUser.email);
    const targetEmail = normalizeEmail(targetEmployer.email);

    const requesterProfile = await getUserProfileByEmail(requesterEmail);
    const publicTargetEmployer = await getPublicUserByEmail(targetEmail);
    const targetEmployerProfile = publicTargetEmployer.profile || {};
    const requesterRole = requesterProfile.role || currentUser.role || "";
    const targetRole =
      publicTargetEmployer.role || targetEmployerProfile.role || "";

    if (requesterRole !== "coordinator") {
      throw new Error("Only coordinators can request private contact access.");
    }

    if (targetRole !== "employer") {
      throw new Error("Private contact access can be requested only for employers.");
    }

    const assignedCoordinatorEmail =
      getAssignedCoordinatorEmail(publicTargetEmployer);

    const isRequesterAssignedCoordinator =
      assignedCoordinatorEmail && assignedCoordinatorEmail === requesterEmail;

    if (isRequesterAssignedCoordinator) {
      return {
        status: "already_allowed",
        message: "You are already assigned to this employer.",
      };
    }

    if (!assignedCoordinatorEmail) {
      throw new Error("לא מוגדר רכז משויך למעסיק הזה, ולכן לא ניתן לשלוח בקשת גישה.");
    }

    const existingRequestQuery = query(
      collection(db, "privacy_requests"),
      where("requesterEmail", "==", requesterEmail),
      where("targetEmail", "==", targetEmail),
      where("status", "==", "pending")
    );

    const existingSnapshot = await getDocs(existingRequestQuery);

    if (!existingSnapshot.empty) {
      return {
        status: "already_pending",
        message: "Access request already exists.",
      };
    }

    const requestData = {
      requesterEmail,
      requesterRole: "coordinator",

      targetEmail,
      targetEmployerName:
        targetEmployerProfile.organization ||
        publicTargetEmployer.organization ||
        "",
      targetEmployerRole: "employer",

      assignedCoordinatorEmail,
      targetAssignedCoordinatorEmail: assignedCoordinatorEmail,
      requiresCoordinatorApproval: true,

      employerApprovalStatus: "pending",
      coordinatorApprovalStatus: "pending",

      status: "pending",

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),

      employerReviewedAt: null,
      employerReviewedBy: null,

      coordinatorReviewedAt: null,
      coordinatorReviewedBy: null,

      reviewedAt: null,
      reviewedBy: null,
    };

    const requesterName = requesterProfile.fullName || currentUser.displayName || "";
    const requesterCenterName = requesterProfile.centerName || "";
    const requesterPhone = requesterProfile.phone || "";

    if (requesterName) {
      requestData.requesterName = requesterName;
    }

    if (requesterCenterName) {
      requestData.requesterCenterName = requesterCenterName;
    }

    if (requesterPhone) {
      requestData.requesterPhone = requesterPhone.slice(0, 30);
    }

    if (import.meta.env.DEV) {
      console.log("privacy request payload", requestData);
    }

    const docRef = await addDoc(
      collection(db, "privacy_requests"),
      requestData
    );

    const senderName = requesterName;
    const notificationRequests = [
      () =>
        createPrivateDetailsRequestNotification({
          recipientEmail: targetEmail,
          senderEmail: requesterEmail,
          senderName,
          requestId: docRef.id,
        }),
    ];

    if (assignedCoordinatorEmail && assignedCoordinatorEmail !== requesterEmail) {
      notificationRequests.push(() =>
        createPrivateDetailsCoordinatorApprovalNotification({
          recipientEmail: assignedCoordinatorEmail,
          senderEmail: requesterEmail,
          senderName,
          requestId: docRef.id,
        })
      );
    }

    for (const sendNotification of notificationRequests) {
      try {
        await sendNotification();
      } catch (notificationError) {
        console.warn(
          "Private details request notification failed:",
          notificationError
        );
      }
    }

    return {
      id: docRef.id,
      status: "pending",
      requiresCoordinatorApproval: true,
      message:
        "Access request sent. Employer and assigned coordinator approval are required.",
    };
  },

  async getContactAccessStatus(currentUser, targetEmployer) {
    if (!currentUser?.email || !targetEmployer?.email) {
      return "none";
    }

    const requesterEmail = currentUser.email.toLowerCase().trim();
    const targetEmail = targetEmployer.email.toLowerCase().trim();

    const assignedCoordinatorEmail = getAssignedCoordinatorEmail(targetEmployer);

    if (assignedCoordinatorEmail && assignedCoordinatorEmail === requesterEmail) {
      return "approved";
    }

    const accessQuery = query(
      collection(db, "privacy_requests"),
      where("requesterEmail", "==", requesterEmail),
      where("targetEmail", "==", targetEmail)
    );

    const snapshot = await getDocs(accessQuery);

    if (snapshot.empty) {
      return "none";
    }

    const requests = snapshot.docs.map((docSnap) => docSnap.data());

    if (requests.some((request) => request.status === "approved")) {
      return "approved";
    }

    if (requests.some((request) => request.status === "pending")) {
      return "pending";
    }

    if (requests.some((request) => request.status === "rejected")) {
      return "rejected";
    }

    return "none";
  },

  async getPrivateContactDetails(currentUser, targetEmployer) {
    if (!currentUser?.email || !targetEmployer?.email) {
      return null;
    }

    const privateInfoRef = doc(
      db,
      "users",
      targetEmployer.email,
      "private_info",
      "details"
    );

    const privateInfoSnap = await getDoc(privateInfoRef);

    if (!privateInfoSnap.exists()) {
      return null;
    }

    const data = privateInfoSnap.data();

    return {
      phone: data.phone || "",
      directEmail: data.directEmail || "",
      approvedViewers: data.approved_viewers || [],
    };
  },

  async getActionablePrivacyRequests(currentUser, userRole) {
    if (!currentUser?.email || !userRole) {
      return [];
    }

    if (userRole === "admin") {
      return [];
    }

    const currentEmail = currentUser.email.toLowerCase().trim();

    let requestsQuery;

    if (userRole === "employer") {
      requestsQuery = query(
        collection(db, "privacy_requests"),
        where("targetEmail", "==", currentEmail),
        where("employerApprovalStatus", "==", "pending"),
        where("status", "==", "pending")
      );
    } else if (userRole === "coordinator") {
      requestsQuery = query(
        collection(db, "privacy_requests"),
        where("assignedCoordinatorEmail", "==", currentEmail),
        where("employerApprovalStatus", "==", "approved"),
        where("coordinatorApprovalStatus", "==", "pending"),
        where("requiresCoordinatorApproval", "==", true),
        where("status", "==", "pending")
      );
    } else {
      return [];
    }

    const snapshot = await getDocs(requestsQuery);

    return snapshot.docs.map(mapPrivacyRequestDoc);
  },

  async getPrivacyRequestsForCurrentUser({ email, role }) {
    const currentEmail = normalizeEmail(email);

    if (!currentEmail || !["coordinator", "employer"].includes(role)) {
      return [];
    }

    const queryDefinitions = [
      ["requesterEmail", currentEmail],
      ["targetEmail", currentEmail],
      ["assignedCoordinatorEmail", currentEmail],
      ["targetAssignedCoordinatorEmail", currentEmail],
    ];

    const snapshots = await Promise.all(
      queryDefinitions.map(([fieldName, value]) =>
        getDocs(
          query(
            collection(db, "privacy_requests"),
            where(fieldName, "==", value)
          )
        )
      )
    );

    const requestsById = new Map();

    snapshots.forEach((snapshot) => {
      snapshot.docs.forEach((docSnap) => {
        requestsById.set(docSnap.id, mapPrivacyRequestDoc(docSnap));
      });
    });

    return Array.from(requestsById.values());
  },

  subscribeToPendingCoordinatorApprovals(currentUser, callback) {
    const currentUserEmail = normalizeEmail(currentUser?.email);
    const safeCallback =
      typeof callback === "function"
        ? (requests) => {
            try {
              callback(requests);
            } catch (error) {
              console.error(
                "PrivacyService Error: pending approvals callback failed",
                error
              );
            }
          }
        : noop;

    if (!currentUserEmail) {
      safeCallback([]);
      return noop;
    }

    const targetRoutingQuery = query(
      collection(db, "privacy_requests"),
      where("targetAssignedCoordinatorEmail", "==", currentUserEmail)
    );
    const legacyAssignmentQuery = query(
      collection(db, "privacy_requests"),
      where("assignedCoordinatorEmail", "==", currentUserEmail)
    );
    const snapshotsBySource = {
      targetRouting: [],
      legacyAssignment: [],
    };
    const emitMergedRequests = () => {
      const requestsById = new Map();

      [...snapshotsBySource.targetRouting, ...snapshotsBySource.legacyAssignment]
        .filter((request) =>
          isPendingCoordinatorApproval(request, currentUserEmail)
        )
        .forEach((request) => {
          requestsById.set(request.id, request);
        });

      safeCallback(Array.from(requestsById.values()));
    };

    try {
      const unsubscribeTargetRouting = onSnapshot(
        targetRoutingQuery,
        (snapshot) => {
          snapshotsBySource.targetRouting = snapshot.docs.map(mapPrivacyRequestDoc);
          emitMergedRequests();
        },
        (error) => {
          console.error(
            "PrivacyService Error: pending approvals target routing subscription failed",
            error
          );
          snapshotsBySource.targetRouting = [];
          emitMergedRequests();
        }
      );
      const unsubscribeLegacyAssignment = onSnapshot(
        legacyAssignmentQuery,
        (snapshot) => {
          snapshotsBySource.legacyAssignment =
            snapshot.docs.map(mapPrivacyRequestDoc);
          emitMergedRequests();
        },
        (error) => {
          console.error(
            "PrivacyService Error: pending approvals assignment subscription failed",
            error
          );
          snapshotsBySource.legacyAssignment = [];
          emitMergedRequests();
        }
      );

      return () => {
        unsubscribeTargetRouting();
        unsubscribeLegacyAssignment();
      };
    } catch (error) {
      console.error(
        "PrivacyService Error: pending approvals subscription setup failed",
        error
      );
      safeCallback([]);
      return noop;
    }
  },

  async approvePrivacyRequest(request, currentUser) {
    if (!request?.id) {
      throw new Error("Request id is missing.");
    }

    if (!currentUser?.email) {
      throw new Error("User must be logged in to approve a request.");
    }

    const requestRef = doc(db, "privacy_requests", request.id);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
      throw new Error("Privacy request was not found.");
    }

    // Use the latest Firestore state so a stale UI snapshot cannot skip a step.
    const requestData = {
      id: requestSnap.id,
      ...requestSnap.data(),
    };

    const requesterEmail = normalizeEmail(requestData.requesterEmail);
    const targetEmail = normalizeEmail(requestData.targetEmail);

    if (!requesterEmail) {
      throw new Error("Requester email is missing.");
    }

    if (!targetEmail) {
      throw new Error("Target employer email is missing.");
    }

    const currentUserEmail = normalizeEmail(currentUser.email);
    const assignedCoordinatorEmail = normalizeEmail(
      requestData.assignedCoordinatorEmail
    );
    const targetAssignedCoordinatorEmail = normalizeEmail(
      requestData.targetAssignedCoordinatorEmail
    );

    const isAssignedCoordinatorApproval =
      assignedCoordinatorEmail === currentUserEmail ||
      targetAssignedCoordinatorEmail === currentUserEmail;
    const isEmployerApproval = targetEmail === currentUserEmail;

    const currentEmployerApprovalStatus = normalizeValue(
      requestData.employerApprovalStatus || "pending"
    );

    const currentCoordinatorApprovalStatus = normalizeValue(
      requestData.coordinatorApprovalStatus || "pending"
    );

    if (normalizeValue(requestData.status) !== "pending") {
      throw new Error("Only pending privacy requests can be approved.");
    }

    if (isEmployerApproval) {
      if (currentEmployerApprovalStatus !== "pending") {
        throw new Error("Employer approval is not pending.");
      }
    } else if (isAssignedCoordinatorApproval) {
      if (requesterEmail === currentUserEmail) {
        throw new Error("Requester cannot approve their own request.");
      }

      if (currentEmployerApprovalStatus !== "approved") {
        throw new Error("Employer approval is required first.");
      }

      if (currentCoordinatorApprovalStatus !== "pending") {
        throw new Error("Coordinator approval is not pending.");
      }
    } else {
      throw new Error("You are not allowed to approve this request.");
    }

    const nextEmployerApprovalStatus = isAssignedCoordinatorApproval
      ? currentEmployerApprovalStatus
      : "approved";

    const nextCoordinatorApprovalStatus = isAssignedCoordinatorApproval
      ? "approved"
      : currentCoordinatorApprovalStatus;

    const nextRequestData = {
      ...requestData,
      requesterEmail,
      targetEmail,
      employerApprovalStatus: nextEmployerApprovalStatus,
      coordinatorApprovalStatus: nextCoordinatorApprovalStatus,
    };
    const shouldApproveRequest = isPrivacyRequestFullyApproved(nextRequestData);

    const approvalBatch = writeBatch(db);

    approvalBatch.update(requestRef, {
      employerApprovalStatus: nextEmployerApprovalStatus,
      coordinatorApprovalStatus: nextCoordinatorApprovalStatus,

      status: shouldApproveRequest ? "approved" : "pending",

      employerReviewedAt: isAssignedCoordinatorApproval
        ? requestData.employerReviewedAt || null
        : serverTimestamp(),
      employerReviewedBy: isAssignedCoordinatorApproval
        ? requestData.employerReviewedBy || null
        : currentUserEmail,

      coordinatorReviewedAt: isAssignedCoordinatorApproval
        ? serverTimestamp()
        : requestData.coordinatorReviewedAt || null,
      coordinatorReviewedBy: isAssignedCoordinatorApproval
        ? currentUserEmail
        : requestData.coordinatorReviewedBy || null,

      reviewedAt: shouldApproveRequest ? serverTimestamp() : null,
      reviewedBy: shouldApproveRequest ? currentUserEmail : null,

      updatedAt: serverTimestamp(),
    });

    if (shouldApproveRequest) {
      createPrivateAccessGrant(request.id, nextRequestData, approvalBatch);
    }

    // Commit the final approval and grant together so neither can exist alone.
    await approvalBatch.commit();

    return {
      status: shouldApproveRequest ? "approved" : "pending",
      message: shouldApproveRequest
        ? "Privacy request approved successfully."
        : "Approval saved. Waiting for the additional required approval.",
    };
  },

  async rejectPrivacyRequest(request, currentUser) {
    if (!request?.id) {
      throw new Error("Request id is missing.");
    }

    if (!currentUser?.email) {
      throw new Error("User must be logged in to reject a request.");
    }

    const requestRef = doc(db, "privacy_requests", request.id);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
      throw new Error("Privacy request was not found.");
    }

    const requestData = {
      id: requestSnap.id,
      ...requestSnap.data(),
    };

    const currentUserEmail = normalizeEmail(currentUser.email);
    const requesterEmail = normalizeEmail(requestData.requesterEmail);
    const targetEmail = normalizeEmail(requestData.targetEmail);
    const assignedCoordinatorEmail = normalizeEmail(
      requestData.assignedCoordinatorEmail
    );
    const targetAssignedCoordinatorEmail = normalizeEmail(
      requestData.targetAssignedCoordinatorEmail
    );

    const isAssignedCoordinatorRejection =
      assignedCoordinatorEmail === currentUserEmail ||
      targetAssignedCoordinatorEmail === currentUserEmail;
    const isEmployerRejection = targetEmail === currentUserEmail;

    if (normalizeValue(requestData.status) !== "pending") {
      throw new Error("Only pending privacy requests can be rejected.");
    }

    if (isEmployerRejection) {
      if (normalizeValue(requestData.employerApprovalStatus) !== "pending") {
        throw new Error("Employer approval is not pending.");
      }
    } else if (isAssignedCoordinatorRejection) {
      if (requesterEmail === currentUserEmail) {
        throw new Error("Requester cannot reject their own request.");
      }

      if (normalizeValue(requestData.employerApprovalStatus) !== "approved") {
        throw new Error("Employer approval is required first.");
      }

      if (normalizeValue(requestData.coordinatorApprovalStatus) !== "pending") {
        throw new Error("Coordinator approval is not pending.");
      }
    } else {
      throw new Error("You are not allowed to reject this request.");
    }

    await updateDoc(requestRef, {
      status: "rejected",

      employerApprovalStatus: isAssignedCoordinatorRejection
        ? requestData.employerApprovalStatus || "pending"
        : "rejected",

      coordinatorApprovalStatus: isAssignedCoordinatorRejection
        ? "rejected"
        : requestData.coordinatorApprovalStatus || "pending",

      employerReviewedAt: isAssignedCoordinatorRejection
        ? requestData.employerReviewedAt || null
        : serverTimestamp(),
      employerReviewedBy: isAssignedCoordinatorRejection
        ? requestData.employerReviewedBy || null
        : currentUserEmail,

      coordinatorReviewedAt: isAssignedCoordinatorRejection
        ? serverTimestamp()
        : requestData.coordinatorReviewedAt || null,
      coordinatorReviewedBy: isAssignedCoordinatorRejection
        ? currentUserEmail
        : requestData.coordinatorReviewedBy || null,

      reviewedAt: serverTimestamp(),
      reviewedBy: currentUserEmail,
      updatedAt: serverTimestamp(),
    });

    return {
      status: "rejected",
      message: "Privacy request rejected successfully.",
    };
  },

  async approveAssignedCoordinatorPrivacyRequest(request, currentUser) {
    return this.approvePrivacyRequest(request, currentUser);
  },

  async rejectAssignedCoordinatorPrivacyRequest(request, currentUser) {
    return this.rejectPrivacyRequest(request, currentUser);
  },
};
