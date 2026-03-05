import { Router } from 'express';

interface LoginBody {
  username?: string;
  password?: string;
}

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const { username, password } = req.body as LoginBody;

  if (!username || !password) {
    res.status(400).json({
      message: 'username and password are required',
    });
    return;
  }

  const normalized = username.trim();
  const encoded = Buffer.from(normalized).toString('base64url');

  res.json({
    token: `knowject-token-${encoded}`,
    user: {
      id: `user-${encoded}`,
      username: normalized,
      name: normalized === 'admin' ? '项目管理员' : normalized,
    },
  });
});
