import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { TeachersService } from './teachers.service';
import { Roles } from '../common/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import {
  AssignSubjectsDto,
  CreateTeacherDto,
  UpdateTeacherDto,
} from './dto/people.dto';

@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachers: TeachersService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateTeacherDto) {
    return this.teachers.create(actor, dto);
  }

  @Get()
  list(@CurrentUser() actor: AuthUser, @Query('centerId') centerId?: string) {
    return this.teachers.list(actor, centerId);
  }

  @Get(':id')
  get(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.teachers.get(actor, id);
  }

  @Get(':id/students')
  listStudents(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.teachers.listStudents(actor, id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTeacherDto,
  ) {
    return this.teachers.update(actor, id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.teachers.remove(actor, id);
  }

  @Put(':id/subject-assignments')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  setSubjectAssignments(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: AssignSubjectsDto,
  ) {
    return this.teachers.setSubjectAssignments(actor, id, dto);
  }
}
