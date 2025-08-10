import express, { Request, Response } from 'express';
import colyseus from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';

const { Server } = colyseus;
import { createServer } from 'http';
import { MovementRoom } from './rooms/movement.js';
import { AuctionTickerRoom } from './rooms/ticker.js';
import { AuctionRoom } from './rooms/auction.js';

const app = express();
app.get('/', (_req: Request, res: Response) => res.send('Aurelian Realtime Server - Deployed'));
const server = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server })
});

gameServer.define('movement', MovementRoom);
gameServer.define('auction_ticker', AuctionTickerRoom);
gameServer.define('auction', AuctionRoom);

const port = Number(process.env.PORT || 8787);
server.listen(port, ()=> console.log(`Realtime running on :${port}`));
