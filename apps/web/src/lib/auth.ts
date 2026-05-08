import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const API_URL = process.env["API_URL"] ?? "http://localhost:3001";

export const authOptions: NextAuthOptions = {
  ...(process.env["NEXTAUTH_SECRET"] !== undefined && { secret: process.env["NEXTAUTH_SECRET"] }),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        tenantSlug: { label: "Organization", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.tenantSlug) {
          return null;
        }

        try {
          const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
              tenantSlug: credentials.tenantSlug,
            }),
          });

          if (!res.ok) return null;

          const data = await res.json();
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            tenantId: data.tenant.id,
            tenantSlug: data.tenant.slug,
            tenantName: data.tenant.name,
            accessToken: data.token,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as Record<string, unknown>).role as string;
        token.tenantId = (user as Record<string, unknown>).tenantId as string;
        token.tenantSlug = (user as Record<string, unknown>).tenantSlug as string;
        token.tenantName = (user as Record<string, unknown>).tenantName as string;
        token.accessToken = (user as Record<string, unknown>).accessToken as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session as Record<string, unknown>).tenantId = token.tenantId;
        (session as Record<string, unknown>).tenantSlug = token.tenantSlug;
        (session as Record<string, unknown>).tenantName = token.tenantName;
        (session as Record<string, unknown>).accessToken = token.accessToken;
        (session.user as Record<string, unknown>).role = token.role;
        (session.user as Record<string, unknown>).id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
};
