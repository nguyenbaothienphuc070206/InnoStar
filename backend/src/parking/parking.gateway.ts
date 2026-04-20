import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import { ParkingStreamPayload, Slot, SlotDiff } from "./parking.types";

@WebSocketGateway({ cors: { origin: "*" } })
export class ParkingGateway {
  @WebSocketServer()
  server!: Server;

  pushUpdate(data: Slot[]) {
    this.server.emit("parking-update", data);
  }

  pushStream(payload: ParkingStreamPayload) {
    this.server.emit("parking-stream", payload);
  }

  pushSlotDiff(diff: SlotDiff[]) {
    if (diff.length === 0) {
      return;
    }
    this.server.emit("parking-diff", diff);
  }
}
