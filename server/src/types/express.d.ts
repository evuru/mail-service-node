import type { IUser } from '../models/User';
import type { IEmailApp } from '../models/EmailApp';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      emailApp?: IEmailApp;
    }
  }
}
