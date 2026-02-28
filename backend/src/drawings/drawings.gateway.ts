import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // Restrict as needed
  },
})
export class DrawingsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DrawingsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Helper methods for emitting events
  emitDrawingCreated(drawing: any) {
    this.server.emit('drawing.created', drawing);
  }

  emitDrawingUpdated(drawing: any) {
    this.server.emit('drawing.updated', drawing);
  }

  emitDrawingDeleted(drawingId: string) {
    this.server.emit('drawing.deleted', { id: drawingId });
  }
}
