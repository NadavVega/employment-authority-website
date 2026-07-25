import {
  Body,
  Controller,
  INestApplication,
  Module,
  Post,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsString, Length } from 'class-validator';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../../src/app.module';
import { configureApplication } from '../../src/application';
import { FIREBASE_TOKEN_VERIFIER } from '../../src/auth/firebase-token-verifier';
import { Public } from '../../src/common/decorators/public.decorator';
import { DatabaseService } from '../../src/database/database.service';

class ValidationProbeDto {
  @IsString()
  @Length(2, 20)
  name!: string;
}

@Public()
@Controller('validation-probe')
class ValidationProbeController {
  @Post()
  validate(@Body() body: ValidationProbeDto): ValidationProbeDto {
    return body;
  }
}

@Module({
  imports: [AppModule],
  controllers: [ValidationProbeController],
})
class FoundationTestModule {}

describe('Backend V2 foundation API', () => {
  let app: INestApplication;
  const database = {
    isReady: vi.fn<() => Promise<boolean>>(),
  };

  beforeEach(async () => {
    database.isReady.mockResolvedValue(true);
    const moduleRef = await Test.createTestingModule({
      imports: [FoundationTestModule],
    })
      .overrideProvider(DatabaseService)
      .useValue(database)
      .overrideProvider(FIREBASE_TOKEN_VERIFIER)
      .useValue({
        verifyIdToken: vi.fn(),
      })
      .compile();

    app = moduleRef.createNestApplication({ bodyParser: false });
    configureApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('reports liveness', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(response.body).toEqual({ status: 'ok' });
    expect(response.headers['x-request-id']).toBeTypeOf('string');
  });

  it('reports readiness when PostgreSQL is available', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(200);

    expect(response.body).toEqual({ status: 'ready' });
  });

  it('fails readiness safely when PostgreSQL is unavailable', async () => {
    database.isReady.mockResolvedValue(false);

    const response = await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(503);

    expect(response.body).toMatchObject({
      status: 503,
      code: 'DEPENDENCY_UNAVAILABLE',
      detail: 'A required service dependency is unavailable.',
      errors: [],
    });
    expect(JSON.stringify(response.body)).not.toMatch(
      /postgres|database|sql|stack/i,
    );
  });

  it('returns safe problem details for malformed requests', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/validation-probe')
      .send({ name: 1, unexpected: true })
      .expect(400);

    expect(response.body).toMatchObject({
      status: 400,
      code: 'VALIDATION_FAILED',
      title: 'Request validation failed',
      requestId: expect.any(String),
    });
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'name' }),
        expect.objectContaining({ field: 'unexpected' }),
      ]),
    );
    expect(response.body).not.toHaveProperty('stack');
  });
});
