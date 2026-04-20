import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ParkingController } from "./parking.controller";
import { SlotEventEntity } from "./entities/slot-event.entity";
import { ParkingGateway } from "./parking.gateway";
import { ParkingPoller } from "./parking.poller";
import { ParkingService } from "./parking.service";
import { SlotService } from "./services/slot.service";
import { CameraService } from "./services/camera.service";
import { RouteService } from "./services/route.service";
import { SimulationEngineService } from "./services/simulation-engine.service";

@Module({
  imports: [TypeOrmModule.forFeature([SlotEventEntity])],
  controllers: [ParkingController],
  providers: [
    ParkingService,
    ParkingGateway,
    ParkingPoller,
    SlotService,
    CameraService,
    RouteService,
    SimulationEngineService
  ]
})
export class ParkingModule {}
