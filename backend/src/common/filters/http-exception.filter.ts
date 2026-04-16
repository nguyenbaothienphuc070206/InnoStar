import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = exception instanceof HttpException ? exception.getResponse() : "Internal server error";

    const message =
      typeof payload === "string"
        ? payload
        : Array.isArray((payload as { message?: unknown }).message)
          ? (payload as { message: string[] }).message.join("; ")
          : ((payload as { message?: string }).message ?? "Unexpected error");

    this.logger.error(`${request.method} ${request.url} -> ${status} ${message}`);

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId: request.headers["x-request-id"] || null
    });
  }
}
