// utils/sanitizeInvites.js
async function sanitizeInvites(pendingInvites, adminId) {
  if (!pendingInvites.length) return { valid: [], invalid: [] };

  // Remove duplicates based on user ID
  pendingInvites = [
    ...new Map(pendingInvites.map(inv => [inv.user.toString(), inv])).values()
  ];

  // Remove admin if present
  pendingInvites = pendingInvites.filter(inv => inv.user.toString() !== adminId.toString());

  // Validate users exist
  const userIds = pendingInvites.map(inv => inv.user);
  const existingUsers = await User.find({ _id: { $in: userIds } }).select("_id");
  const existingUserIds = existingUsers.map(u => u._id.toString());

  const valid = pendingInvites
    .filter(inv => existingUserIds.includes(inv.user.toString()))
    .map(inv => ({
      ...inv,
      invitedBy: adminId,
      status: inv.status || "pending",
      project: null, // will set after project creation
    }));

  const invalid = pendingInvites.filter(inv => !existingUserIds.includes(inv.user.toString()));

  return { valid, invalid };
}


module.exports={
    sanitizeInvites
}