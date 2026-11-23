import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AttendanceService } from './attendance.service';
import { Roles } from '../common/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import {
  ListAttendanceQuery,
  MarkAttendanceDto,
  UpdateAttendanceDto,
} from './dto/attendance.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER, Role.COURSE_OWNER, Role.TEACHER)
  mark(@CurrentUser() actor: AuthUser, @Body() dto: MarkAttendanceDto) {
    return this.attendance.mark(actor, dto);
  }

  @Get()
  list(@CurrentUser() actor: AuthUser, @Query() query: ListAttendanceQuery) {
    return this.attendance.list(actor, query);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER, Role.COURSE_OWNER, Role.TEACHER)
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
  ) {
    return this.attendance.update(actor, id, dto);
  }
}
