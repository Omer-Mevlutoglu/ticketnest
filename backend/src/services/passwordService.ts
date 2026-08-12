import userModel from "../models/userModel";
import { comparePassword, hashPassword } from "../utils/helperHash";
import { httpError } from "../utils/httpError";

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  const user = await userModel.findById(userId);
  if (!user) throw httpError(404, "User not found.");

  if (!(await comparePassword(currentPassword, user.passwordHash))) {
    throw httpError(400, "Current password is incorrect.", {
      code: "CURRENT_PASSWORD_INVALID",
    });
  }
  if (await comparePassword(newPassword, user.passwordHash)) {
    throw httpError(400, "New password must be different from the current password.", {
      code: "PASSWORD_UNCHANGED",
    });
  }

  const passwordHash = await hashPassword(newPassword);
  const result = await userModel.updateOne(
    { _id: user._id, passwordHash: user.passwordHash },
    {
      $set: {
        passwordHash,
        passwordChangedAt: new Date(),
        mustChangePassword: false,
      },
      $inc: { sessionVersion: 1 },
    }
  );

  if (result.matchedCount !== 1) {
    throw httpError(409, "Password changed in another session. Please sign in again.", {
      code: "PASSWORD_CHANGE_CONFLICT",
    });
  }
};
