import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import userModel from "../models/userModel";
import { comparePassword } from "../utils/helperHash";

// A real bcrypt hash keeps the missing-user path close to the same cost as a
// normal login, so response timing does not become an account-existence hint.
const DUMMY_PASSWORD_HASH =
  "$2b$10$MzLEKzQ0ggYqqXesKEhAFev5bT.CBGgc8ejqbjcwIFa8DyFSnn242";
const INVALID_CREDENTIALS = "Invalid email or password.";

passport.serializeUser((user: any, done) => {
  done(null, user._id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await userModel.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

export default passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await userModel.findOne({ email });
        const isPasswordValid = await comparePassword(
          password,
          user?.passwordHash ?? DUMMY_PASSWORD_HASH
        );

        if (
          !user ||
          !isPasswordValid ||
          user.isSuspended ||
          !user.emailVerified
        ) {
          return done(null, false, { message: INVALID_CREDENTIALS });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);
