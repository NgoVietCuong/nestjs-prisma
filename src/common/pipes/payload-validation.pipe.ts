import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { ServerException } from 'src/common/exceptions';
import { ERROR_RESPONSE } from 'src/shared/constants';
import { z } from 'src/shared/utilities';
import { ZodError } from 'zod';

@Injectable()
export class ZodPayloadValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    const schema = (metadata.metatype as any)?.schema as z.ZodTypeAny;

    if (!schema) return value;

    try {
      return schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.reduce((acc, err) => {
          const path = err.path.join('.');
          acc[path] = acc[path] ? `${acc[path]}, ${err.message}` : err.message;
          return acc;
        }, {});

        const failedProperties = error.issues.map((e) => e.path.join('.')).join(', ');

        throw new ServerException({
          ...ERROR_RESPONSE.REQUEST_PAYLOAD_VALIDATION_ERROR,
          message: `ValidateFailed: ${failedProperties}`,
          details: details,
        });
      }
      throw error;
    }
  }
}
