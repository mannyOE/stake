import { IUserDoc } from '@/modules/user/user.interfaces'


declare global {
  namespace Express {
    interface Request {
      account: IUserDoc & { permissions: string[] },
    }
  }
}

export { }