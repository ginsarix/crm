import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "~/server/db";

export const auth = betterAuth({
	database: prismaAdapter(db, {
		provider: "postgresql", // or "sqlite" or "mysql"
	}),
	emailAndPassword: {
		enabled: true,
	},
	plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
