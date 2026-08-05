import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { getAllUsers, logoutUser, registerUser } from "../services/authService";
import { httpError } from "../utils/httpError";
import { validatedQuery } from "../middleware/validate";
import { PaginationInput } from "../validation/schemas";
import "../strategies/local-strategy";
// POST /api/auth/register
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // userData must match RegisterDTO shape: { username, email, password, role }
    const newUser = await registerUser(req.body);
    // return safe user info (without passwordHash)
    res
      .status(201)
      .json({ message: "User registered successfully", user: newUser });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
export const login = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate("local", (err: Error, user: any, info: any) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return next(
        httpError(401, info?.message || "Login failed", {
          code: "LOGIN_FAILED",
        })
      );
    }

    // Issue a fresh session ID before authenticating, so a session fixed by an
    // attacker before login cannot become an authenticated one.
    req.session.regenerate((regenerateErr) => {
      if (regenerateErr) return next(regenerateErr);

      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);

        // Stamp the user's current version. `rejectStaleSessions` compares it
        // on every later request, so a password reset or a suspension can end
        // this session immediately.
        req.session.sessionVersion = user.sessionVersion ?? 0;

        req.session.save((saveErr) => {
          if (saveErr) return next(saveErr);

          return res.json({
            message: "Logged in successfully",
            user: {
              id: (user as any).id,
              email: (user as any).email,
              role: (user as any).role,
              isApproved: (user as any).isApproved,
              mustChangePassword: (user as any).mustChangePassword === true,
            },
          });
        });
      });
    });
  })(req, res, next);
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.isAuthenticated()) {
    return next(httpError(401, "User is not authenticated"));
  }

  try {
    await logoutUser(req);

    res.clearCookie("connect.sid", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    return res.json({ message: "User logged out successfully" });
  } catch (err) {
    return next(err);
  }
};

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const users = await getAllUsers(validatedQuery<PaginationInput>(req));
    return res.status(200).json(users);
  } catch (err) {
    next(err);
  }
};
