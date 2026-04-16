import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import { Slot } from "./parking.types";

@WebSocketGateway({ cors: { origin: "*" } })
export class ParkingGateway {
  @WebSocketServer()
  server!: Server;

  pushUpdate(data: Slot[]) {
    this.server.emit("parking-update", data);
  }
}
