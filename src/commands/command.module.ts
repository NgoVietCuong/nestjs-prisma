import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/infrastructure/prisma';
import { GenerateAdminCommand } from './generate-admin.command';
import { GenerateResourceCommand } from './generate-resource.command';

@Module({
  imports: [PrismaModule],
  providers: [GenerateAdminCommand, GenerateResourceCommand],
})
export class CommandModule {}
