import { Room } from 'colyseus';
const items = ['Iron Ore','Herb','Hide','Pearl','Relic Fragment'];

export class AuctionTickerRoom extends Room {
  onCreate(){
    this.clock.setInterval(()=>{
      const msg = { item: items[Math.floor(Math.random()*items.length)], price: Math.round(5+Math.random()*120) };
      this.broadcast('tick', msg);
    }, 1000);
  }
}
