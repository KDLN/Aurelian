
import express from 'express';
const app = express();
app.get('/', (_req, res)=> res.send('Aurelian Worker OK'));
setInterval(()=>{ console.log('[tick] world updated'); }, 5000);
const port = Number(process.env.PORT || 8080);
app.listen(port, ()=> console.log('Worker on :' + port));
