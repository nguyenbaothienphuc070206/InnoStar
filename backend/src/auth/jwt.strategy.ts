import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Role } from "./rbac/role.enum";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET", "greenpark_dev_secret")
    });
  }

  validate(payload: { sub: string; email: string; displayName: string; role: Role }) {
    return {
      userId: payload.sub,
      email: payload.email,
      displayName: payload.displayName,
      role: payload.role
    };
  }
}
