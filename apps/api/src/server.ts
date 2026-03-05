import cors from 'cors';
import express from 'express';
import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { memoryRouter } from './routes/memory.js';

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/memory', memoryRouter);

app.get('/', (_req, res) => {
  res.json({
    name: 'knowject-api',
    status: 'running',
    docs: ['/api/health', '/api/auth/login', '/api/memory/overview', '/api/memory/query'],
  });
});

app.use((_req, res) => {
  res.status(404).json({ message: 'not found' });
});

app.listen(port, () => {
  console.log(`knowject api running on http://localhost:${port}`);
});
