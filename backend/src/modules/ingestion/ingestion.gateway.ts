import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { IMPORT_STATUS_EVENT, ImportStatusPayload } from './ingestion.events';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/ingestion' })
export class IngestionGateway {
  @WebSocketServer()
  server: Server;

  /** Le client rejoint la room de sa pharmacie pour recevoir les mises à jour. */
  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() pharmacyId: string,
    @ConnectedSocket() client: Socket
  ) {
    client.join(pharmacyId);
  }

  @OnEvent(IMPORT_STATUS_EVENT)
  handleImportStatus(payload: ImportStatusPayload) {
    this.server.to(payload.pharmacy_id).emit(IMPORT_STATUS_EVENT, payload);
  }
}
