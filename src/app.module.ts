import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { appConfiguration, validationSchema } from 'src/config';
import { winstonConfig } from 'src/infrastructure/logger';
import { PrismaModule } from 'src/infrastructure/prisma';
import { RedisModule } from 'src/infrastructure/redis';
import { AuthModule } from 'src/modules/auth';
import { UserModule } from 'src/modules/user';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema,
      validationOptions: {
        abortEarly: true,
      },
      load: [appConfiguration],
    }),
    WinstonModule.forRootAsync({
      useFactory: (appConfig: ConfigType<typeof appConfiguration>) => {
        return winstonConfig(appConfig.appName);
      },
      inject: [appConfiguration.KEY],
    }),
    UserModule,
    AuthModule,
    PrismaModule,
    RedisModule,
  ],
  providers: [],
})
export class AppModule {}
