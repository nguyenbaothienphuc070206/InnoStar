import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { AuditService } from "./audit.service";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      id?: string;
      user?: { userId?: string; email?: string };
      body?: Record<string, unknown>;
    }>();
    const response = context.switchToHttp().getResponse<{ statusCode: number }>();

    const mutating = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);

    return next.handle().pipe(
      tap(() => {
        if (!mutating) {
          return;
        }

        this.auditService
          .write({
            method: request.method,
            path: request.url,
            statusCode: response.statusCode,
            actorId: request.user?.userId ?? null,
            actorEmail: request.user?.email ?? null,
            requestId: request.id ?? null,
            metadata: {
              bodyKeys: Object.keys(request.body || {})
            }
          })
          .catch(() => null);
      })
    );
  }
}
