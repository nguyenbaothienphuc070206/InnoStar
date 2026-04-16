import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Role } from "../auth/rbac/role.enum";
import { Roles } from "../auth/rbac/roles.decorator";
import { RolesGuard } from "../auth/rbac/roles.guard";
import { OpsService } from "./ops.service";

@Controller("ops")
export class OpsController {
  constructor(private readonly opsService: OpsService) {}

  @Get("health")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.OPERATOR)
  health() {
    return this.opsService.health();
  }

  @Get("ready")
  ready() {
    return this.opsService.readiness();
  }

  @Get("live")
  live() {
    return { live: true, timestamp: new Date().toISOString() };
  }
}
