import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import userModel from "../models/userModel";
import { comparePassword } from "../utils/helperHash";

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
        if (!user) {
          return done(null, false, { message: "User not found" });
        }
        const isPasswordValid = await comparePassword(
          password,
          user.passwordHash
        );
        if (!isPasswordValid) {
          return done(null, false, { message: "Invalid password" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);
