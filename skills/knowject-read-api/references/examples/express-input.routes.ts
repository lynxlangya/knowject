// Fixture: generic Express router exercising the patterns the extractor must catch.
// Not modeled on any real apps/api file - must remain generic per spec 7.1.
import { Router, Request, Response } from 'express';

const router = Router();

router.get('/users', (req: Request, res: Response) => {
  res.json({ users: [] });
});

router.get('/users/:id', async (req, res) => {
  res.json({ user: null });
});

router.post('/users', async (req, res) => {
  res.status(201).json({ id: 'new' });
});

router.patch('/users/:id', async (req, res) => {
  res.json({ ok: true });
});

router.delete('/users/:id', async (req, res) => {
  res.status(204).end();
});

router.get('/orders/:orderId/items/:itemId', async (req, res) => {
  res.json({});
});

export default router;
