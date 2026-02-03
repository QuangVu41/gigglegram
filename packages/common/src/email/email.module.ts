import { Module } from '@nestjs/common';
import { EmailService } from '@common/src/email/email.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EjsAdapter } from '@nestjs-modules/mailer/dist/adapters/ejs.adapter';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MailerModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.getOrThrow<string>('GMAIL_HOST'),
          port: configService.getOrThrow<number>('GMAIL_PORT'),
          secure: false,
          auth: {
            user: configService.getOrThrow<string>('GMAIL_USER'),
            pass: configService.getOrThrow<string>('GMAIL_PASS'),
          },
        },
        defaults: {
          from: 'Gigglegram <no-reply@gigglegram.com>',
        },
        template: {
          dir: join(__dirname, './templates'),
          adapter: new EjsAdapter({
            inlineCssEnabled: true,
          }),
          options: {
            strict: false,
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
