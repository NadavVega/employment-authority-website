import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  setDoc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase/config";

export const privacyService = {
  async requestContactAccess(currentUser, targetEmployer) {
    if (!currentUser?.email) {
      throw new Error("User must be logged in to request access.");
    }

    if (!targetEmployer?.email) {
      throw new Error("Target employer email is missing.");
    }

    const requesterEmail = currentUser.email.toLowerCase().trim();
    const targetEmail = targetEmployer.email.toLowerCase().trim();

    const assignedCoordinatorEmail = targetEmployer.assignedCoordinatorEmail
      ? String(targetEmployer.assignedCoordinatorEmail).toLowerCase().trim()
      : "";

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
      targetEmail,

      targetEmployerName: targetEmployer.organization || "",
      targetEmployerContactName: targetEmployer.name || "",
      targetEmployerRole: targetEmployer.role || "",

      assignedCoordinatorEmail,
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

    const assignedCoordinatorEmail = targetEmployer.assignedCoordinatorEmail
      ? String(targetEmployer.assignedCoordinatorEmail).toLowerCase().trim()
      : "";

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
        where("coordinatorApprovalStatus", "==", "pending"),
        where("requiresCoordinatorApproval", "==", true),
        where("status", "==", "pending")
      );
    } else {
      return [];
    }

    const snapshot = await getDocs(requestsQuery);

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();

      return {
        id: docSnap.id,
        requesterEmail: data.requesterEmail || "",
        targetEmail: data.targetEmail || "",
        targetEmployerName: data.targetEmployerName || "",
        targetEmployerContactName: data.targetEmployerContactName || "",
        assignedCoordinatorEmail: data.assignedCoordinatorEmail || "",
        requiresCoordinatorApproval: data.requiresCoordinatorApproval === true,
        employerApprovalStatus: data.employerApprovalStatus || "pending",
        coordinatorApprovalStatus:
          data.coordinatorApprovalStatus || "not_required",
        status: data.status || "pending",
        createdAt: data.createdAt || null,
      };
    });
  },

  async getPendingPrivacyRequests() {
    const pendingRequestsQuery = query(
      collection(db, "privacy_requests"),
      where("status", "==", "pending")
    );

    const snapshot = await getDocs(pendingRequestsQuery);

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();

      return {
        id: docSnap.id,

        requesterEmail: data.requesterEmail || "",
        targetEmail: data.targetEmail || "",

        targetEmployerName: data.targetEmployerName || "",
        targetEmployerContactName: data.targetEmployerContactName || "",
        targetEmployerRole: data.targetEmployerRole || "",

        assignedCoordinatorEmail: data.assignedCoordinatorEmail || "",
        requiresCoordinatorApproval:
          data.requiresCoordinatorApproval === true,

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
    });
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

    const privateInfoRef = doc(
      db,
      "users",
      request.targetEmail,
      "private_info",
      "details"
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
        : currentUser.email,

      coordinatorReviewedAt: isAssignedCoordinatorApproval
        ? serverTimestamp()
        : request.coordinatorReviewedAt || null,
      coordinatorReviewedBy: isAssignedCoordinatorApproval
        ? currentUser.email
        : request.coordinatorReviewedBy || null,

      reviewedAt: shouldApproveRequest ? serverTimestamp() : null,
      reviewedBy: shouldApproveRequest ? currentUser.email : null,

      updatedAt: serverTimestamp(),
    });

    if (shouldApproveRequest) {
      await setDoc(
        privateInfoRef,
        {
          approved_viewers: arrayUnion(request.requesterEmail),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
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

      reviewedAt: serverTimestamp(),
      reviewedBy: currentUser.email,
      updatedAt: serverTimestamp(),
    });

    return {
      status: "rejected",
      message: "Privacy request rejected successfully.",
    };
  },
};