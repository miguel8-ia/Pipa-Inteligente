import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

const IS_DEV_NO_OAUTH =
  process.env.NODE_ENV !== "production" && !process.env.OAUTH_SERVER_URL;

function makeDevAdminUser(): User {
  const now = new Date().toISOString();
  return {
    id: 1,
    openId: "local-admin",
    name: "Dev Admin",
    email: "admin@localhost",
    loginMethod: "dev",
    role: "admin",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  if (IS_DEV_NO_OAUTH) {
    return { req: opts.req, res: opts.res, user: makeDevAdminUser() };
  }

  let user: User | null = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    // public procedures are allowed without auth
  }

  return { req: opts.req, res: opts.res, user };
}
