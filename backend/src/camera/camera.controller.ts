import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Role } from "../auth/rbac/role.enum";
import { Roles } from "../auth/rbac/roles.decorator";
import { RolesGuard } from "../auth/rbac/roles.guard";
import { CameraService } from "./camera.service";
import { RegisterCameraDto } from "./dto/register-camera.dto";

@Controller("cameras")
export class CameraController {
  constructor(private readonly cameraService: CameraService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.OPERATOR)
  register(@Body() body: RegisterCameraDto) {
    return this.cameraService.register(body);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.OPERATOR)
  list() {
    return this.cameraService.list();
  }

  @Post("sync")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.OPERATOR)
  syncAll() {
    return this.cameraService.syncAll();
  }
}
