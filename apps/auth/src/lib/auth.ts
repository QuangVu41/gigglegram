import dotenv from 'dotenv';
dotenv.config();
import { db, members, organizationRoles } from '@repo/database';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bootstrapCommonModule, EmailService } from '@repo/common';
import { organization } from 'better-auth/plugins';
import { ac, owner } from '@repo/types';
import { eq } from 'drizzle-orm';

export const auth = betterAuth({
  appName: 'Gigglegram Auth Service',
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await (await bootstrapCommonModule())
        .get(EmailService)
        .sendPasswordResetEmail({ user, url });
    },
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      await (await bootstrapCommonModule())
        .get(EmailService)
        .sendVerificationEmail({ user, url });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectURI: process.env.GOOGLE_REDIRECT_URI!,
      mapProfileToUser: (profile) => ({
        username: profile.email.split('@')[0],
      }),
    },
  },
  trustedOrigins: [...process.env.BETTER_AUTH_TRUSTED_ORIGINS!.split(',')],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 3600,
    },
  },
  user: {
    additionalFields: {
      username: {
        type: 'string',
        required: true,
      },
      bio: {
        type: 'string',
        required: false,
      },
      gender: {
        type: ['male', 'female'],
        defaultValue: null,
      },
      isPrivate: {
        type: 'boolean',
        defaultValue: false,
        fieldName: 'is_private',
      },
      followersCount: {
        type: 'number',
        defaultValue: 0,
        fieldName: 'followers_count',
      },
      followingCount: {
        type: 'number',
        defaultValue: 0,
        fieldName: 'following_count',
      },
      postsCount: {
        type: 'number',
        defaultValue: 0,
        fieldName: 'posts_count',
      },
      lastActiveAt: {
        type: 'date',
        fieldName: 'last_active_at',
      },
    },
  },
  hooks: {},
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const userOrgs = await db.query.members.findMany({
            where: eq(members.userId, session.userId),
            columns: {
              role: true,
              organizationId: true,
            },
          });
          const activeOrganizationId = userOrgs.find(
            (uo) => uo.role.includes('owner') || uo.role.includes('default'),
          )?.organizationId;

          return {
            data: {
              ...session,
              activeOrganizationId,
            },
          };
        },
      },
    },
  },
  plugins: [
    organization({
      ac,
      roles: {
        owner,
      },
      dynamicAccessControl: {
        enabled: true,
      },
      organizationHooks: {
        afterCreateOrganization: async ({ organization }) => {
          await db.insert(organizationRoles).values({
            id: crypto.randomUUID(),
            organizationId: organization.id,
            role: 'default',
            permission: JSON.stringify({}),
          });
        },
      },
    }),
  ],
});
