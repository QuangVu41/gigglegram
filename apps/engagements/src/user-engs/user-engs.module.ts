import { Module } from '@nestjs/common';
import { UserEngsController } from '@/src/user-engs/user-engs.controller';
import { UserEngsService } from '@/src/user-engs/user-engs.service';

@Module({
  controllers: [UserEngsController],
  providers: [UserEngsService],
})
export class UserEngsModule {}
