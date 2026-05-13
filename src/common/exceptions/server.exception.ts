import { HttpException, HttpStatus } from '@nestjs/common';
import type { HttpErrorResponseDto } from 'src/shared/dto';

export class ServerException extends HttpException {
  constructor(response: Omit<HttpErrorResponseDto, 'path' | 'timestamp'>, status?: number) {
    const statusCode: number = status || response.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
    super({ ...response }, statusCode);
  }
}
