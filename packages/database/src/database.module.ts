import { Global, Module } from '@nestjs/common';
import { DATABASE_CONNECTION } from '@db/src/constants';
import { db } from '@db/src/drizzle/db';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useValue: db,
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
