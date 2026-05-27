import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { compare, hash } from "bcryptjs";
import { Repository } from "typeorm";
import { UserEntity } from "../users/entities/user.entity";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { Role } from "./rbac/role.enum";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    private readonly jwtService: JwtService
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersRepo.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existing) {
      throw new UnauthorizedException("Email already exists");
    }

    const usersCount = await this.usersRepo.count();
    const assignedRole = usersCount === 0 ? Role.ADMIN : Role.USER;

    const passwordHash = await hash(dto.password, 10);
    const user = this.usersRepo.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      displayName: dto.displayName || "Eco Traveler",
      role: assignedRole
    });
    const saved = await this.usersRepo.save(user);

    return this.issueToken(saved);
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepo.findOne({ where: { email: dto.email.toLowerCase() } });
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const ok = await compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.issueToken(user);
  }

  async getProfile(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      ecoPoints: user.ecoPoints,
      createdAt: user.createdAt
    };
  }

  async addEcoPoints(userId: string, points: number) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      return;
    }

    user.ecoPoints += points;
    await this.usersRepo.save(user);
  }

  private issueToken(user: UserEntity) {
    const payload = {
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        ecoPoints: user.ecoPoints
      }
    };
  }
}
