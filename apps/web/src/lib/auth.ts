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
        const u = user as unknown as Record<string, unknown>;
        token.role = u["role"] as string;
        token.tenantId = u["tenantId"] as string;
        token.tenantSlug = u["tenantSlug"] as string;
        token.tenantName = u["tenantName"] as string;
        token.accessToken = u["accessToken"] as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const s = session as unknown as Record<string, unknown>;
        s["tenantId"] = token.tenantId;
        s["tenantSlug"] = token.tenantSlug;
        s["tenantName"] = token.tenantName;
        s["accessToken"] = token.accessToken;
        (session.user as unknown as Record<string, unknown>)["role"] = token.role;
        (session.user as unknown as Record<string, unknown>)["id"] = token.sub;
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
