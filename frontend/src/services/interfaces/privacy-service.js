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
  setDoc,
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
    role: data.role || profile.role || "",
    email: normalizedEmail,
  };
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

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
      employer?.profile?.assignedCoordinatorEmail ||
      employer?.coordinatorEmail ||
      employer?.profile?.coordinatorEmail
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
    coordinatorApprovalStatus:
      data.coordinatorApprovalStatus || "not_required",

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

    const requiresCoordinatorApproval =
      assignedCoordinatorEmail && assignedCoordinatorEmail !== requesterEmail;

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
      requesterName: requesterProfile.fullName || currentUser.displayName || "",
      requesterCenterName: requesterProfile.centerName || "",
      requesterRole: requesterProfile.role || "coordinator",

      targetEmail,
      targetEmployerName:
        targetEmployerProfile.organization ||
        publicTargetEmployer.organization ||
        "",
      targetEmployerContactName:
        targetEmployerProfile.fullName ||
        publicTargetEmployer.fullName ||
        targetEmployerProfile.name ||
        publicTargetEmployer.name ||
        "",
      targetEmployerRole:
        publicTargetEmployer.role ||
        targetEmployerProfile.role ||
        "",

      assignedCoordinatorEmail,
      targetAssignedCoordinatorEmail: assignedCoordinatorEmail,
      requiresCoordinatorApproval: Boolean(requiresCoordinatorApproval),

      employerApprovalStatus: "pending",
      coordinatorApprovalStatus: requiresCoordinatorApproval
        ? "pending"
        : "not_required",

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

    const docRef = await addDoc(
      collection(db, "privacy_requests"),
      requestData
    );

    const senderName = requesterProfile.fullName || currentUser.displayName || "";
    const notificationRequests = [
      createPrivateDetailsRequestNotification({
        recipientEmail: targetEmail,
        recipientUid: publicTargetEmployer.uid,
        senderEmail: requesterEmail,
        senderUid: currentUser.uid,
        senderName,
        requestId: docRef.id,
      }),
    ];

    if (assignedCoordinatorEmail && assignedCoordinatorEmail !== requesterEmail) {
      notificationRequests.push(
        createPrivateDetailsCoordinatorApprovalNotification({
          recipientEmail: assignedCoordinatorEmail,
          senderEmail: requesterEmail,
          senderUid: currentUser.uid,
          senderName,
          requestId: docRef.id,
        })
      );
    }

    const notificationResults = await Promise.allSettled(notificationRequests);
    const failedNotification = notificationResults.find(
      (result) => result.status === "rejected"
    );

    if (failedNotification) {
      console.warn(
        "Private details request notification failed:",
        failedNotification.reason
      );
    }

    return {
      id: docRef.id,
      status: "pending",
      requiresCoordinatorApproval: Boolean(requiresCoordinatorApproval),
      message: requiresCoordinatorApproval
        ? "Access request sent. Employer and assigned coordinator approval are required."
        : "Access request sent. Employer approval is required.",
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

  async getPendingPrivacyRequests() {
    const pendingRequestsQuery = query(
      collection(db, "privacy_requests"),
      where("status", "==", "pending")
    );

    const snapshot = await getDocs(pendingRequestsQuery);

    return snapshot.docs.map(mapPrivacyRequestDoc);
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

    if (!request?.requesterEmail) {
      throw new Error("Requester email is missing.");
    }

    if (!request?.targetEmail) {
      throw new Error("Target employer email is missing.");
    }

    if (!currentUser?.email) {
      throw new Error("User must be logged in to approve a request.");
    }

    const requestRef = doc(db, "privacy_requests", request.id);

    const currentUserEmail = currentUser.email.toLowerCase().trim();
    const assignedCoordinatorEmail = request.assignedCoordinatorEmail
      ? String(request.assignedCoordinatorEmail).toLowerCase().trim()
      : "";

    const isAssignedCoordinatorApproval =
      assignedCoordinatorEmail && assignedCoordinatorEmail === currentUserEmail;

    const currentEmployerApprovalStatus =
      request.employerApprovalStatus || "pending";

    const currentCoordinatorApprovalStatus =
      request.coordinatorApprovalStatus || "not_required";

    const nextEmployerApprovalStatus = isAssignedCoordinatorApproval
      ? currentEmployerApprovalStatus
      : "approved";

    const nextCoordinatorApprovalStatus = isAssignedCoordinatorApproval
      ? "approved"
      : currentCoordinatorApprovalStatus;

    const shouldApproveRequest =
      nextEmployerApprovalStatus === "approved" &&
      (request.requiresCoordinatorApproval !== true ||
        nextCoordinatorApprovalStatus === "approved");

    const privateAccessRef = doc(
      db,
      "users",
      request.targetEmail,
      "private_access",
      request.requesterEmail
    );

    await updateDoc(requestRef, {
      employerApprovalStatus: nextEmployerApprovalStatus,
      coordinatorApprovalStatus: nextCoordinatorApprovalStatus,

      status: shouldApproveRequest ? "approved" : "pending",

      employerReviewedAt: isAssignedCoordinatorApproval
        ? request.employerReviewedAt || null
        : serverTimestamp(),
      employerReviewedBy: isAssignedCoordinatorApproval
        ? request.employerReviewedBy || null
        : currentUserEmail,

      coordinatorReviewedAt: isAssignedCoordinatorApproval
        ? serverTimestamp()
        : request.coordinatorReviewedAt || null,
      coordinatorReviewedBy: isAssignedCoordinatorApproval
        ? currentUserEmail
        : request.coordinatorReviewedBy || null,

      reviewedAt: shouldApproveRequest ? serverTimestamp() : null,
      reviewedBy: shouldApproveRequest ? currentUserEmail : null,

      updatedAt: serverTimestamp(),
    });

    if (shouldApproveRequest) {
      await setDoc(
        privateAccessRef,
        {
          sourceRequestId: request.id,
          targetEmail: request.targetEmail,
          requesterEmail: request.requesterEmail,
          assignedCoordinatorEmail,
          employerApprovalStatus: "approved",
          coordinatorApprovalStatus: nextCoordinatorApprovalStatus,
          grantedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );
    }

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

    const currentUserEmail = currentUser.email.toLowerCase().trim();
    const assignedCoordinatorEmail = request.assignedCoordinatorEmail
      ? String(request.assignedCoordinatorEmail).toLowerCase().trim()
      : "";

    const isAssignedCoordinatorRejection =
      assignedCoordinatorEmail && assignedCoordinatorEmail === currentUserEmail;

    await updateDoc(requestRef, {
      status: "rejected",

      employerApprovalStatus: isAssignedCoordinatorRejection
        ? request.employerApprovalStatus || "pending"
        : "rejected",

      coordinatorApprovalStatus: isAssignedCoordinatorRejection
        ? "rejected"
        : request.coordinatorApprovalStatus || "not_required",

      employerReviewedAt: isAssignedCoordinatorRejection
        ? request.employerReviewedAt || null
        : serverTimestamp(),
      employerReviewedBy: isAssignedCoordinatorRejection
        ? request.employerReviewedBy || null
        : currentUserEmail,

      coordinatorReviewedAt: isAssignedCoordinatorRejection
        ? serverTimestamp()
        : request.coordinatorReviewedAt || null,
      coordinatorReviewedBy: isAssignedCoordinatorRejection
        ? currentUserEmail
        : request.coordinatorReviewedBy || null,

      reviewedAt: serverTimestamp(),
      reviewedBy: currentUserEmail,
      updatedAt: serverTimestamp(),
    });

    return {
      status: "rejected",
      message: "Privacy request rejected successfully.",
    };
  },
};
