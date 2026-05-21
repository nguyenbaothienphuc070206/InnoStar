import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { Observable, tap } from "rxjs";

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{ method: string; url: string; id?: string }>();
    const started = Date.now();

    return next.handle().pipe(
      tap(() => {
        const elapsed = Date.now() - started;
        this.logger.log(`${request.method} ${request.url} [${request.id ?? "n/a"}] ${elapsed}ms`);
      })
    );
  }
}
