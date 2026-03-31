import { EmailService } from '@repo/common';
import { Inject, Injectable } from '@nestjs/common';
import {
  AfterHook,
  type AuthHookContext,
  Hook,
} from '@thallesp/nestjs-better-auth';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  DATABASE_CONNECTION,
  members,
  organizations,
  schema,
  userNotificationSettings,
  userPrivacySettings,
  users,
} from '@repo/database';
import { eq } from 'drizzle-orm';

@Hook()
@Injectable()
export class SignUpHook {
  constructor(
    private readonly emailService: EmailService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  @AfterHook()
  async handle(ctx: AuthHookContext) {
    if (ctx.path.startsWith('/sign-up')) {
      const newSession = ctx.context.newSession ?? {
        user: {
          name: ctx.body.name as string,
          email: ctx.body.email as string,
        },
      };
      if (newSession) {
        const [_, organization, createdUser] = await Promise.all([
          this.emailService.sendWelcomeEmail(newSession),
          this.db.query.organizations.findFirst({
            where: eq(organizations.slug, 'user-org'),
          }),
          this.db.query.users.findFirst({
            where: eq(users.email, newSession.user.email),
          }),
        ]);

        if (organization && createdUser) {
          await Promise.all([
            this.db.insert(userPrivacySettings).values({
              userId: createdUser.id,
            }),
            this.db.insert(userNotificationSettings).values({
              userId: createdUser.id,
            }),
            this.db.insert(members).values({
              id: crypto.randomUUID(),
              userId: createdUser.id,
              organizationId: organization.id,
              role: 'default',
              createdAt: new Date(),
            }),
          ]);
        }
      }
    }
  }
}
