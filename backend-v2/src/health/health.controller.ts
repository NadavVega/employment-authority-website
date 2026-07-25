import { Controller, Get } from '@nestjs/common';

import { Public } from '../common/decorators/public.decorator';
import { HealthService } from './health.service';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  liveness(): { status: 'ok' } {
    return this.healthService.liveness();
  }

  @Get('ready')
  readiness(): Promise<{ status: 'ready' }> {
    return this.healthService.readiness();
  }
}
