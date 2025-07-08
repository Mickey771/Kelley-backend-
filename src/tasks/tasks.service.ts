import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async submitTask(userId: number, productId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userTaskOverrides: true },
    });

    if (!user) throw new BadRequestException("User not found");
    if (user.balance < 0)
      throw new BadRequestException("Cannot submit task with negative balance");

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) throw new BadRequestException("Product not found");
    if (!product.isActive || new Date() > product.endDate) {
      throw new BadRequestException("Product is not available");
    }

    // Check level requirements
    const maxTasks = user.level === 1 ? 33 : 38;
    const minBalance = user.level === 1 ? 50 : 1000;
    const profitRate = user.level === 1 ? 0.75 : 1;

    if (user.balance < minBalance) {
      throw new BadRequestException(
        `Minimum balance of $${minBalance} required`
      );
    }

    if (user.completedTasks >= maxTasks) {
      if (user.level === 1 && user.completedTasks === 33) {
        throw new BadRequestException(
          "Upgrade to premium to continue or withdraw first"
        );
      }
      throw new BadRequestException(
        "Maximum tasks reached. Please withdraw first"
      );
    }

    // Get negative amount (check for user override)
    const userOverride = user.userTaskOverrides.find(
      (o) => o.productId === productId
    );
    const negativeAmount =
      userOverride?.negativeAmount || product.negativeAmount;

    if (user.balance < negativeAmount) {
      throw new BadRequestException("Insufficient balance for this task");
    }

    // Calculate profit
    const profitEarned = product.price * (profitRate / 100);
    const newBalance = user.balance + profitEarned - negativeAmount;

    // Execute transaction
    return this.prisma.$transaction(async (tx) => {
      // Create task submission
      const submission = await tx.taskSubmission.create({
        data: {
          userId,
          productId,
          profitEarned,
          amountDebited: negativeAmount,
        },
      });

      // Update user balance and completed tasks
      await tx.user.update({
        where: { id: userId },
        data: {
          balance: newBalance,
          completedTasks: user.completedTasks + 1,
        },
      });

      return submission;
    });
  }

  async getUserTasks(userId: number) {
    return this.prisma.taskSubmission.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async resetUserTasks(userId: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { completedTasks: 0 },
    });
  }
}
