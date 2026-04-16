import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Observable } from "rxjs";

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{ headers: Record<string, string>; id?: string }>();
    const response = context.switchToHttp().getResponse<{ setHeader: (name: string, value: string) => void }>();

    const incomingRequestId = request.headers["x-request-id"];
    const requestId = incomingRequestId || randomUUID();

    request.id = requestId;
    response.setHeader("x-request-id", requestId);

    return next.handle();
  }
}
