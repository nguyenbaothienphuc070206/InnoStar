import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ReportDto } from "./dto/report.dto";
import { ParkingService } from "./parking.service";

@Controller("parking")
export class ParkingController {
  constructor(private readonly parkingService: ParkingService) {}

  @Get("slots")
  getSlots() {
    return this.parkingService.getAll();
  }

  @Get("route")
  getGreenRoute(@Query("destination") destination?: string) {
    return this.parkingService.getGreenRoute(destination || "City center");
  }

  @Post("report")
  report(@Body() body: ReportDto) {
    this.parkingService.addReport(body.user || "anonymous", body.message || "No message");
    return { ok: true };
  }

  @Get("reports")
  reports() {
    return this.parkingService.getReports();
  }

  @Get("analytics")
  analytics() {
    return this.parkingService.getAnalytics();
  }

  @Get("heatmap-hourly")
  heatmapHourly() {
    return this.parkingService.getHourlyHeatmap();
  }

  @Get("predict")
  predict() {
    return this.parkingService.getPredictions();
  }

  @Get("personalized")
  personalized(@Query("user") user?: string, @Query("interest") interest?: string) {
    return this.parkingService.getPersonalizedPlan(user || "Eco Traveler", interest || "cafe");
  }

  @Post("checkin")
  checkin(@Body() body: { user?: string; mode?: "bus" | "bike" | "walk" | "ev" }) {
    return this.parkingService.checkInEcoAction(body.user || "Eco Traveler", body.mode || "bike");
  }

  @Get("leaderboard")
  leaderboard() {
    return this.parkingService.getLeaderboard();
  }

  @Post("upload")
  @UseInterceptors(FileInterceptor("photo"))
  upload(@UploadedFile() file?: Express.Multer.File) {
    return {
      ok: true,
      filename: file?.originalname || null,
      note: "Image received. AI service can process this in the next pipeline step."
    };
  }
}
