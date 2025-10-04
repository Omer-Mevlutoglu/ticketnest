import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { getAllUsers, logoutUser, registerUser } from "../services/authService";
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
      // authentication failed
      return res.status(401).json({ message: info?.message || "Login failed" });
    }
    // establish session
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      // success
      return res.json({
        message: "Logged in successfully",
        user: {
          id: (user as any).id,
          email: (user as any).email,
          role: (user as any).role,
          isApproved: (user as any).isApproved,
        },
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
    return res.status(401).json({ message: "User is not authenticated" });
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
    const users = await getAllUsers();
    return res.status(200).json(users);
  } catch (err) {
    next(err);
  }
};
