export const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

export const isEventCreatedByCurrentCoordinator = (event, currentUser) => {
  const currentEmail = normalizeEmail(currentUser?.email);
  const currentUid = currentUser?.uid || '';

  const ownerEmail = normalizeEmail(
    event?.createdByEmail ||
    event?.creatorEmail ||
    event?.ownerEmail ||
    event?.coordinatorEmail ||
    event?.createdBy ||
    ''
  );

  const ownerUid = String(
    event?.createdByUid ||
    event?.creatorUid ||
    event?.ownerUid ||
    event?.createdBy ||
    ''
  ).trim();

  return Boolean(
    (currentEmail && ownerEmail && currentEmail === ownerEmail) ||
    (currentUid && ownerUid && currentUid === ownerUid)
  );
};
