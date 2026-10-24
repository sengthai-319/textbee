import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UsersService } from '../../users/users.service'
import { AuthService } from '../auth.service'

@Injectable()
// Guard for authenticating users by either jwt token or api key
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    let userId
    let tokenIssuedAt: number | undefined
    const apiKeyString = request.headers['x-api-key'] || request.query.apiKey
    if (request.headers.authorization?.startsWith('Bearer ')) {
      const bearerToken = request.headers.authorization.split(' ')[1]
      try {
        const payload = this.jwtService.verify(bearerToken)
        userId = payload.sub
        tokenIssuedAt = payload.iat
      } catch (e) {
        throw new HttpException(
          { error: 'Unauthorized', code: 'AUTH_INVALID' },
          HttpStatus.UNAUTHORIZED,
        )
      }
    } else if (apiKeyString) {
      const apiKey = await this.authService.verifyApiKey(apiKeyString)

      if (apiKey) {
        userId = apiKey.user
        request.apiKey = apiKey
      }
    }

    if (userId) {
      const user = await this.usersService.findOne({ _id: userId })
      // A password change signs out every session started before it. iat is
      // in whole seconds, so a token from the same second still counts.
      const revoked =
        tokenIssuedAt !== undefined &&
        user?.passwordChangedAt &&
        tokenIssuedAt < Math.floor(new Date(user.passwordChangedAt).getTime() / 1000)
      if (user && !revoked) {
        request.user = user
        this.authService.trackAccessLog({ request })
        return true
      }
    }

    throw new HttpException(
      { error: 'Unauthorized', code: 'AUTH_INVALID' },
      HttpStatus.UNAUTHORIZED,
    )
  }
}
