import { Controller, Get, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  listMine(@CurrentUser() actor: AuthUser) {
    return this.notifications.listMine(actor);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  markAllRead(@CurrentUser() actor: AuthUser) {
    return this.notifications.markAllRead(actor);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  markRead(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead(actor, id);
  }
}
