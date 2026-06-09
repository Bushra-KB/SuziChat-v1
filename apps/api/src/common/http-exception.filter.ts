import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type ErrorResponseBody = {
  statusCode: number;
  message: string | string[];
  error?: string;
};

function normalizeHttpResponse(
  exception: HttpException,
): { statusCode: number; message: string | string[]; error?: string } {
  const statusCode = exception.getStatus();
  const response = exception.getResponse();

  if (typeof response === 'string') {
    return { statusCode, message: response };
  }

  if (response && typeof response === 'object') {
    const body = response as Partial<ErrorResponseBody>;
    return {
      statusCode,
      message: body.message ?? exception.message,
      error: body.error,
    };
  }

  return { statusCode, message: exception.message };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const isHttpException = exception instanceof HttpException;
    const normalized = isHttpException
      ? normalizeHttpResponse(exception)
      : {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            process.env.NODE_ENV === 'production'
              ? 'Internal server error'
              : exception instanceof Error
                ? exception.message
                : 'Internal server error',
        };

    if (!isHttpException) {
      this.logger.error(
        `Unhandled ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(normalized.statusCode).json({
      ...normalized,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
