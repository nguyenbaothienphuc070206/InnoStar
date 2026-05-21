import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CameraController } from "./camera.controller";
import { CameraService } from "./camera.service";

@Module({
  imports: [ConfigModule],
  controllers: [CameraController],
  providers: [CameraService],
  exports: [CameraService]
})
export class CameraModule {}
