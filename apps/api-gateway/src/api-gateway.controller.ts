import { Controller, Get } from '@nestjs/common';

@Controller()
export class APIGatewayController {
  @Get()
  getHello() {
    return { status: 'ok', service: 'api-gateway' };
  }

  @Get('health')
  getHealth() {
    return { status: 'ok', service: 'api-gateway' };
  }
}
