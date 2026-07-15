import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  check() {
    return { status: 'ok' };
  }

  // TODO: supprimer après validation Sentry en prod/staging
  @Get('debug-sentry')
  @ApiOperation({ summary: '[TEMP] Déclenche une erreur pour tester Sentry' })
  debugSentry() {
    throw new Error('[TEST] Sentry Backend Savely — supprimer après validation');
  }
}
