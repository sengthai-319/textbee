import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common'

/**
 * For routes behind AuthGuard that a signed-in person must do themselves,
 * not a program holding an API key. Managing API keys is the case: a key
 * that could mint more keys would let anyone holding a leaked phone or relay
 * key create their own, so revoking the leaked one would not lock them out.
 */
@Injectable()
export class SessionOnly implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    if (request.apiKey) {
      throw new HttpException(
        {
          error: 'API keys can only be managed from the dashboard, not with an API key.',
          code: 'SESSION_REQUIRED',
        },
        HttpStatus.FORBIDDEN,
      )
    }
    return true
  }
}
