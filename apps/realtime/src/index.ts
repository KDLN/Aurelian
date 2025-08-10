import express from 'express';
import colyseus from 'colyseus';
const { Server } = colyseus;
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';
import { MovementRoom } from './rooms/movement.js';
import { AuctionTickerRoom } from './rooms/ticker.js';

const app = express();
app.get('/', (_req, res)=> res.send('Aurelian Realtime OK'));
const server = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server })
});

gameServer.define('movement', MovementRoom);
gameServer.define('auction_ticker', AuctionTickerRoom);

const port = Number(process.env.PORT || 8787);
server.listen(port, ()=> console.log(`Realtime running on :${port}`));
