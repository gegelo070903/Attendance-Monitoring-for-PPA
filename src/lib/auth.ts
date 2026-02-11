import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from './prisma';
import { logActivity, ActivityActions } from './activityLogger';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          // Log failed login attempt
          await logActivity({
            userName: credentials.email,
            action: ActivityActions.LOGIN,
            description: `Failed login attempt for ${credentials.email} - User not found`,
            type: "WARNING",
          });
          throw new Error('User not found');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          // Log failed login attempt
          await logActivity({
            userId: user.id,
            userName: user.name || user.email,
            action: ActivityActions.LOGIN,
            description: `Failed login attempt for ${user.name || user.email} - Invalid password`,
            type: "WARNING",
          });
          throw new Error('Invalid password');
        }

        // Log successful login
        await logActivity({
          userId: user.id,
          userName: user.name || user.email,
          action: ActivityActions.LOGIN,
          description: `${user.name || user.email} logged in successfully`,
          type: "SUCCESS",
          metadata: {
            role: user.role,
            department: user.department,
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
          position: user.position,
          shiftType: user.shiftType,
          profileImage: user.profileImage,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.department = user.department;
        token.position = user.position;
        token.shiftType = user.shiftType;
        token.profileImage = user.profileImage;
      }
      // Refresh user data on session update
      if (trigger === 'update') {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { 
            profileImage: true, 
            department: true, 
            position: true,
            shiftType: true,
          },
        });
        if (dbUser) {
          token.profileImage = dbUser.profileImage;
          token.department = dbUser.department;
          token.position = dbUser.position;
          token.shiftType = dbUser.shiftType;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.department = token.department as string | null;
        session.user.position = token.position as string | null;
        session.user.shiftType = token.shiftType as string;
        session.user.profileImage = token.profileImage as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
