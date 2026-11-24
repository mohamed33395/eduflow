import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { TasksService } from './tasks.service';
import { Roles } from '../common/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import {
  CreateTaskDto,
  ReviewTaskSubmissionDto,
  SendResultDto,
  SubmitTaskDto,
  TaskFormDataQuery,
} from './dto/tasks.dto';

const CENTER_MANAGERS = [Role.SUPER_ADMIN, Role.CENTER_OWNER];

@Controller()
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  // ── form helpers ──
  @Get('tasks/form-data')
  @Roles(...CENTER_MANAGERS)
  formData(@CurrentUser() actor: AuthUser, @Query() query: TaskFormDataQuery) {
    return this.tasks.formData(actor, query.subjectId);
  }

  // ── center ──
  @Post('tasks')
  @Roles(...CENTER_MANAGERS)
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateTaskDto) {
    return this.tasks.create(actor, dto);
  }

  @Get('tasks')
  list(@CurrentUser() actor: AuthUser, @Query('centerId') centerId?: string) {
    return this.tasks.list(actor, centerId);
  }

  @Get('tasks/mine')
  @Roles(Role.STUDENT)
  mine(@CurrentUser() actor: AuthUser) {
    return this.tasks.mine(actor);
  }

  @Get('tasks/review-queue')
  @Roles(Role.TEACHER, Role.CENTER_OWNER, Role.SUPER_ADMIN)
  reviewQueue(@CurrentUser() actor: AuthUser) {
    return this.tasks.reviewQueue(actor);
  }

  @Get('tasks/:id')
  get(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.tasks.get(actor, id);
  }

  // ── student ──
  @Post('tasks/:id/submissions')
  @Roles(Role.STUDENT)
  submit(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: SubmitTaskDto,
  ) {
    return this.tasks.submit(actor, id, dto);
  }

  // ── review ──
  @Patch('task-submissions/:id/review')
  @Roles(Role.TEACHER, Role.CENTER_OWNER, Role.SUPER_ADMIN)
  review(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewTaskSubmissionDto,
  ) {
    return this.tasks.review(actor, id, dto);
  }

  @Post('task-submissions/:id/send-result')
  @Roles(Role.TEACHER, Role.CENTER_OWNER, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  sendResult(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: SendResultDto,
  ) {
    return this.tasks.sendResult(actor, id, dto);
  }
}
