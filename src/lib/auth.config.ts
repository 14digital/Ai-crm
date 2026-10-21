import type { NextAuthConfig } from "next-auth";

// Auth config WITHOUT Prisma — safe for Edge Runtime (middleware)
export const authConfig: NextAuthConfig = {
  trustHost: true, // Required for Vercel — it terminates SSL and forwards requests
  providers: [], // Providers added in full auth.ts
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
