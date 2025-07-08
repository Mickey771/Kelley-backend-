import {
  Controller,
  Patch,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AdminGuard } from "../auth/admin.guard";

@Controller("admin")
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Post("signup")
  async adminSignup(
    @Body()
    signupDto: {
      email: string;
      username: string;
      password: string;
      name?: string;
    }
  ) {
    return this.adminService.adminSignup(signupDto);
  }

  @Post("login")
  async adminLogin(@Body() loginDto: { username: string; password: string }) {
    return this.adminService.adminLogin(loginDto.username, loginDto.password);
  }

  @Patch("users/:id/balance")
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateUserBalance(
    @Param("id", ParseIntPipe) userId: number,
    @Body() data: { balance: number }
  ) {
    return this.adminService.updateUserBalance(userId, data.balance);
  }

  @Get("users/:id")
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getUserDetails(@Param("id", ParseIntPipe) userId: number) {
    return this.adminService.getUserDetails(userId);
  }
}
