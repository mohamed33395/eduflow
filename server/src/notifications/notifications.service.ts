import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

export interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: Prisma.InputJsonValue;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Create one notification per user. Safe to call inside $transaction too. */
  async notify(inputs: NotifyInput[], tx?: Prisma.TransactionClient) {
    if (!inputs.length) return;
    const db = tx ?? this.prisma;
    await db.notification.createMany({ data: inputs });
  }

  async notifyOne(input: NotifyInput) {
    return this.prisma.notification.create({ data: input });
  }

  async listMine(actor: AuthUser) {
    const [items, unread] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: { userId: actor.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.notification.count({
        where: { userId: actor.id, readAt: null },
      }),
    ]);
    return { items, unread };
  }

  async markRead(actor: AuthUser, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId: actor.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  async markAllRead(actor: AuthUser) {
    await this.prisma.notification.updateMany({
      where: { userId: actor.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }
}
