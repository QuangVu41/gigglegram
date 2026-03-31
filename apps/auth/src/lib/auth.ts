import dotenv from 'dotenv';
import { join } from 'path';
dotenv.config({
  path: join(process.cwd(), '../../.env'),
});
import { db, members, organizationRoles, users } from '@repo/database';
import { betterAuth, BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bootstrapCommonModule, EmailService } from '@repo/common';
import { customSession, organization, admin } from 'better-auth/plugins';
import { ac, owner } from '@repo/types';
import { eq } from 'drizzle-orm';

const betterAuthOptions = {
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
        unique: true,
      },
      bio: {
        type: 'string',
        required: false,
      },
      gender: {
        type: ['male', 'female'],
        defaultValue: null,
      },
      followersCount: {
        type: 'number',
        defaultValue: 0,
        fieldName: 'followersCount',
        required: true,
      },
      followingCount: {
        type: 'number',
        defaultValue: 0,
        fieldName: 'followingCount',
        required: true,
      },
      postsCount: {
        type: 'number',
        defaultValue: 0,
        fieldName: 'postsCount',
        required: true,
      },
      lastActiveAt: {
        type: 'date',
        fieldName: 'lastActiveAt',
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
    admin(),
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
        afterAddMember: async ({ organization, user }) => {
          if (organization.slug === 'admin-org') {
            await db
              .update(users)
              .set({ role: 'admin' })
              .where(eq(users.id, user.id));
          }
        },
      },
    }),
  ],
} satisfies BetterAuthOptions;

export const auth = betterAuth({
  ...betterAuthOptions,
  plugins: [
    ...betterAuthOptions.plugins,
    customSession(async ({ user, session }) => {
      const usr = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
        with: {
          userPrivacySetting: true,
          userNotificationSetting: true,
        },
      });

      return {
        session,
        user: {
          ...user,
          userPrivacySetting: usr?.userPrivacySetting,
          userNotificationSetting: usr?.userNotificationSetting,
        },
      };
    }, betterAuthOptions),
  ],
});
