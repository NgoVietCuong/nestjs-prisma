import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { ZodValidationPipe } from 'nestjs-zod';
import { setupSwagger } from 'src/common/docs';
import { AllExceptionFilter } from 'src/common/exceptions';
import { getAppConfig } from 'src/config';
import { winstonConfig } from 'src/infrastructure/logger';
import { AppModule } from './app.module';

async function bootstrap() {
  const { appName, appPort, isProductionEnv } = getAppConfig();
  const logger = WinstonModule.createLogger(winstonConfig(appName));

  const app = await NestFactory.create(AppModule, {
    logger,
  });

  const httpAdapter = app.get(HttpAdapterHost);
  const configService = app.get(ConfigService);

  app.enableCors();
  app.setGlobalPrefix('api');

  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new AllExceptionFilter(httpAdapter, configService));

  setupSwagger(app);
  await app.listen(appPort);

  if (!isProductionEnv) {
    logger.log({
      message: `Application is ready. View Swagger at http://localhost:${appPort}/swagger`,
      context: 'Application',
    });
  }
}

void bootstrap();
