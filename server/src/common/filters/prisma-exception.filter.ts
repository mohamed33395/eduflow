import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/**
 * Maps common Prisma errors to proper HTTP responses so malformed ids and
 * constraint violations never surface as bare 500s or leak internals.
 *
 * P2002 unique violation        → 409
 * P2003 foreign-key violation   → 400
 * P2025 record not found        → 404
 * everything else               → 400 (validation-ish)
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    const map: Record<string, { status: number; message: string }> = {
      P2002: { status: HttpStatus.CONFLICT, message: 'Record already exists' },
      P2003: { status: HttpStatus.BAD_REQUEST, message: 'Invalid relation id' },
      P2025: { status: HttpStatus.NOT_FOUND, message: 'Record not found' },
    };

    const mapped = map[exception.code] ?? {
      status: HttpStatus.BAD_REQUEST,
      message: 'Invalid request data',
    };

    if (!map[exception.code]) {
      this.logger.warn(
        `Unmapped Prisma error ${exception.code}: ${exception.message}`,
      );
    }

    res.status(mapped.status).json({
      statusCode: mapped.status,
      message: mapped.message,
      code: exception.code,
    });
  }
}
