import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt.js';
import type { RegisterInput, LoginInput } from './auth.schema.js';

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async register(input: RegisterInput) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new Error('Email already in use');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const refreshToken = signRefreshToken({ userId: user.id, email: user.email });

    return { user, accessToken, refreshToken };
  }

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid credentials');
    }

    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const refreshToken = signRefreshToken({ userId: user.id, email: user.email });

    const safeUser = { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };

    return { user: safeUser, accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);
    const user = await this.prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const newRefreshToken = signRefreshToken({ userId: user.id, email: user.email });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}
