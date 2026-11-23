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
import { StudentsService } from './students.service';
import { Roles } from '../common/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import {
  AssignSubjectsDto,
  CreateStudentDto,
  EnrollDto,
  UpdateStudentDto,
} from './dto/people.dto';

@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateStudentDto) {
    return this.students.create(actor, dto);
  }

  @Get()
  list(
    @CurrentUser() actor: AuthUser,
    @Query('centerId') centerId?: string,
    @Query('classId') classId?: string,
    @Query('teacherId') teacherId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('courseId') courseId?: string,
  ) {
    return this.students.list(actor, {
      centerId,
      classId,
      teacherId,
      subjectId,
      courseId,
    });
  }

  @Get(':id')
  get(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.students.get(actor, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.students.update(actor, id, dto);
  }

  @Post(':id/enrollments')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  enroll(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: EnrollDto,
  ) {
    return this.students.enroll(actor, id, dto.courseId);
  }

  @Delete(':id/enrollments/:courseId')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  @HttpCode(HttpStatus.OK)
  unenroll(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Param('courseId') courseId: string,
  ) {
    return this.students.unenroll(actor, id, courseId);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.students.remove(actor, id);
  }

  @Put(':id/subject-assignments')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  setSubjectAssignments(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: AssignSubjectsDto,
  ) {
    return this.students.setSubjectAssignments(actor, id, dto);
  }
}
