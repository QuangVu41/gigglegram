import { EmailService } from '@repo/common';
import { Injectable } from '@nestjs/common';
import {
  AfterHook,
  type AuthHookContext,
  Hook,
} from '@thallesp/nestjs-better-auth';

@Hook()
@Injectable()
export class SignUpHook {
  constructor(private readonly emailService: EmailService) {}

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
        await this.emailService.sendWelcomeEmail(newSession);
      }
    }
  }
}
