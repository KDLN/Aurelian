
import express, { Request, Response } from 'express';

const app = express();
app.get('/', (_req: Request, res: Response) => res.send('Aurelian Worker - Ready'));
setInterval(()=>{ console.log('[tick] world updated'); }, 5000);
const port = Number(process.env.PORT || 8080);
app.listen(port, ()=> console.log('Worker on :' + port));
