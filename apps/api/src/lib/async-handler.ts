import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

export const asyncHandler = (handler: AsyncRequestHandler): RequestHandler => {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
};
