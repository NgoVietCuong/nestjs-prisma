import * as fs from 'fs-extra';
import * as path from 'path';
import { confirm, input, select } from '@inquirer/prompts';
import { Injectable, Logger } from '@nestjs/common';
import _ from 'lodash';
import { Command, CommandRunner } from 'nest-commander';

interface ResourceOptions {
  userSelect: string;
  moduleName: string;
  moduleNameKebab: string;
  modulePath: string;
  modelName: string;
  modelNameCamel: string;
  dtoFileName: string;
}

@Injectable()
@Command({
  name: 'generate-resource',
  description: 'Generate NestJS Resource with Prisma + Zod integration',
})
export class GenerateResourceCommand extends CommandRunner {
  private readonly logger = new Logger(GenerateResourceCommand.name);
  private options: Partial<ResourceOptions> = {};
  private readonly USER_SELECT = {
    CompleteModule: 'CompleteModule',
    EmptyModule: 'EmptyModule',
    Dto: 'Dto',
  };

  async run(): Promise<void> {
    try {
      await this.parseOptions();

      // Validation: Ensure the Zod schema exists before proceeding
      if (this.options.modelName) {
        const zodSchemaPath = `src/generated/zod/schemas/variants/pure/${this.options.modelName}.pure.ts`;
        if (!fs.existsSync(zodSchemaPath)) {
          this.logger.error(
            `❌ Error: Zod schema not found at ${zodSchemaPath}. Did you run 'pnpm prisma:generate'?`,
          );
          return;
        }
      }

      await fs.ensureDir(this.options.modulePath!);

      switch (this.options.userSelect) {
        case this.USER_SELECT.CompleteModule:
          await Promise.all([
            this.writeModuleFile(),
            this.writeServiceFile(),
            this.writeControllerFile(),
            this.writeDtoDirectory(),
            this.writeModuleIndexFile(),
          ]);
          break;
        case this.USER_SELECT.EmptyModule:
          await Promise.all([
            this.writeModuleFile(),
            this.writeServiceFile(),
            this.writeControllerFile(),
            this.writeModuleIndexFile(),
          ]);
          break;
        case this.USER_SELECT.Dto:
          await this.writeDtoDirectory();
          break;
      }
      this.logger.log(`\n🚀 Resource [${this.options.moduleName}] generated successfully!`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Generation failed:', errorMessage);
    }
  }

  private async parseOptions() {
    const userSelect = await select({
      message: 'What do you want to generate?',
      choices: [
        { name: 'Complete module', value: this.USER_SELECT.CompleteModule },
        { name: 'Empty module', value: this.USER_SELECT.EmptyModule },
        { name: 'Dto only (Zod)', value: this.USER_SELECT.Dto },
      ],
    });

    const moduleNameRaw = await input({
      message: 'Enter module name (e.g. user-profile)',
      required: true,
    });

    const moduleName = _.upperFirst(_.camelCase(moduleNameRaw));
    const nameKebab = _.kebabCase(moduleNameRaw);
    const modulePath = `src/modules/${nameKebab}`;

    const confirmPath = await confirm({
      message: `Use default path ${modulePath}?`,
      default: true,
    });
    const finalPath = confirmPath
      ? modulePath
      : `src/modules/${await input({ message: 'Enter custom path relative to src/modules' })}`;

    let modelName = '';
    if (userSelect !== this.USER_SELECT.EmptyModule) {
      modelName = await input({
        message: 'Enter Prisma Model Name (PascalCase, e.g. User)',
        required: true,
      });
    }

    const dtoFileName = await input({
      message: 'Enter DTO filename (without .dto.ts)',
      default: nameKebab,
    });

    this.options = {
      userSelect,
      moduleName,
      moduleNameKebab: nameKebab,
      modulePath: finalPath,
      modelName, // e.g., User
      modelNameCamel: _.camelCase(modelName), // e.g., user
      dtoFileName: _.kebabCase(dtoFileName),
    };
  }

  private async writeDtoDirectory() {
    const { modelName, moduleName, modulePath, dtoFileName } = this.options;
    const dtoDir = path.join(modulePath!, 'dto');
    await fs.mkdir(dtoDir, { recursive: true });

    const dtoFilePath = path.join(dtoDir, `${dtoFileName}.dto.ts`);
    const indexFilePath = path.join(dtoDir, 'index.ts');

    const dtoContent = `
      import { createZodDto } from 'nestjs-zod';
      import { PartialType } from '@nestjs/swagger';
      import { PaginationQueryDto } from 'src/shared/dto';
      import { ${modelName}ModelSchema } from 'src/generated/zod/schemas/variants/pure/${modelName}.pure';
  
      // ****************************** Base ${modelName} Dto  *****************************
      export class Base${modelName}ResponseDto extends createZodDto(${modelName}ModelSchema) {}
  
      // ****************************** Create ${modelName} Dto  ***************************
      export class Create${moduleName}BodyDto extends createZodDto(
       ${modelName}ModelSchema.omit({ 
         id: true, 
         createdAt: true, 
         updatedAt: true, 
         deletedAt: true 
        })
      ) {}
      
      export class Create${moduleName}ResponseDto extends createZodDto(
        ${modelName}ModelSchema.pick({ id: true })
      ) {}
  
      // ****************************** Update ${modelName} Dto  *****************************
      export class Update${moduleName}BodyDto extends PartialType(Create${moduleName}BodyDto) {}
      
      // ****************************** Get ${modelName} Details Dto  ***************************
      export class Get${moduleName}DetailsResponseDto extends Base${modelName}ResponseDto {}
  
      // ****************************** Get ${modelName} List Dto  ***************************
      export class Get${moduleName}ListQueryDto extends PaginationQueryDto {}
      
      export class Get${moduleName}ListResponseDto extends Base${modelName}ResponseDto {}
    `;

    const indexContent = `export * from './${dtoFileName}.dto';\n`;

    await Promise.all([
      fs.writeFile(dtoFilePath, dtoContent, 'utf8'),
      fs.writeFile(indexFilePath, indexContent, 'utf8'),
    ]);
  }

  private async writeModuleFile() {
    const { moduleName, moduleNameKebab, modulePath } = this.options;
    const content = `
      import { Module } from '@nestjs/common';
      import { ${moduleName}Controller } from './${moduleNameKebab}.controller';
      import { ${moduleName}Service } from './${moduleNameKebab}.service';

      @Module({
        controllers: [${moduleName}Controller],
        providers: [${moduleName}Service],
        exports: [${moduleName}Service],
      })
      export class ${moduleName}Module {}
    `;
    await fs.writeFile(path.join(modulePath!, `${moduleNameKebab}.module.ts`), content);
  }

  private async writeServiceFile() {
    const { moduleName, moduleNameKebab, modulePath, modelName, modelNameCamel } = this.options;
    const content = `
      import { Injectable, NotFoundException } from '@nestjs/common';
      import { DatabaseService } from 'src/modules/base/database';
      import { Create${moduleName}BodyDto, Update${moduleName}BodyDto } from './dtos';

      @Injectable()
      export class ${moduleName}Service {
        constructor(private readonly prisma: PrismaService) {}

        async create(data: Create${moduleName}BodyDto) {
          return this.prisma.${modelNameCamel}.create({ data });
        }

        async findAll() {
          return this.prisma.${modelNameCamel}.findMany();
        }

        async findOne(id: number) {
          const record = await this.prisma.${modelNameCamel}.findUnique({ where: { id } });
          if (!record) throw new NotFoundException('${modelName} not found');
          return record;
        }

        async update(id: number, data: Update${moduleName}BodyDto) {
          return this.prisma.${modelNameCamel}.update({ where: { id }, data });
        }

        async remove(id: number) {
          return this.prisma.${modelNameCamel}.delete({ where: { id } });
        }
      }
    `;
    await fs.writeFile(path.join(modulePath!, `${moduleNameKebab}.service.ts`), content);
  }

  private async writeControllerFile() {
    const { moduleName, moduleNameKebab, modulePath, modelNameCamel } = this.options;
    const content = `
      import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
      import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
      import { ${moduleName}Service } from './${moduleNameKebab}.service';
      import { Create${moduleName}BodyDto, Update${moduleName}BodyDto } from './dtos';

      @ApiTags('${moduleName}')
      @ApiBearerAuth()
      @Controller('${moduleNameKebab}')
      export class ${moduleName}Controller {
        constructor(private readonly ${modelNameCamel}Service: ${moduleName}Service) {}

        @Post()
        create(@Body() body: Create${moduleName}BodyDto) {
          return this.${modelNameCamel}Service.create(body);
        }

        @Get()
        findAll() {
          return this.${modelNameCamel}Service.findAll();
        }

        @Get(':id')
        findOne(@Param('id') id: string) {
          return this.${modelNameCamel}Service.findOne(+id);
        }

        @Patch(':id')
        update(@Param('id') id: string, @Body() body: Update${moduleName}BodyDto) {
          return this.${modelNameCamel}Service.update(+id, body);
        }

        @Delete(':id')
        remove(@Param('id') id: string) {
          return this.${modelNameCamel}Service.remove(+id);
        }
      }
    `;
    await fs.writeFile(path.join(modulePath!, `${moduleNameKebab}.controller.ts`), content);
  }

  private async writeModuleIndexFile() {
    const { moduleNameKebab, modulePath } = this.options;
    const content = `
      export * from './${moduleNameKebab}.module';
      export * from './${moduleNameKebab}.controller';
      export * from './${moduleNameKebab}.service';
    `;
    await fs.writeFile(path.join(modulePath!, 'index.ts'), content);
  }
}
