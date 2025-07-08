import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcryptjs";

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async adminSignup(data: {
    email: string;
    username: string;
    password: string;
    name?: string;
  }) {
    const existing = await this.prisma.admin.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }],
      },
    });

    if (existing) {
      throw new BadRequestException("Admin already exists");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const admin = await this.prisma.admin.create({
      data: {
        ...data,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
      },
    });

    return { message: "Admin created successfully", admin };
  }

  async adminLogin(username: string, password: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { username },
    });

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!admin.isActive) {
      throw new UnauthorizedException("Admin account is inactive");
    }

    const payload = { sub: admin.id, username: admin.username, type: "admin" };
    return {
      access_token: this.jwtService.sign(payload),
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        name: admin.name,
      },
    };
  }

  async updateUserBalance(userId: number, balance: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException("User not found");

    return this.prisma.user.update({
      where: { id: userId },
      data: { balance },
      select: {
        id: true,
        username: true,
        email: true,
        balance: true,
      },
    });
  }

  async getUserDetails(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        deposits: { orderBy: { createdAt: "desc" } },
        withdrawals: { orderBy: { createdAt: "desc" } },
      },
    });
  }
}
