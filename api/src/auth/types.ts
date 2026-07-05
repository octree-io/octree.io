// The user shape safe to return to clients and attach to requests. Never
// includes passwordHash / googleId.
export interface AuthUser {
  id: number;
  username: string;
  email: string;
  avatarUrl: string | null;
  createdAt: Date | string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
