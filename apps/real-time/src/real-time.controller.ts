import { Controller, Get } from '@nestjs/common';

@Controller()
export class RealTimeController {
  @Get()
  getHello() {
    return { status: 'ok', service: 'real-time' };
  }

  @Get('health')
  getHealth() {
    return { status: 'ok', service: 'real-time' };
  }
}
