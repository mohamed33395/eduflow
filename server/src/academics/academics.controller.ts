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
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AcademicsService } from './academics.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import {
  CreateClassDto,
  CreateCourseDto,
  CreateSubjectDto,
  UpdateClassDto,
  UpdateCourseDto,
  UpdateSubjectDto,
} from './dto/academics.dto';

const MANAGERS = [Role.SUPER_ADMIN, Role.CENTER_OWNER, Role.COURSE_OWNER];

@Controller()
export class AcademicsController {
  constructor(private readonly academics: AcademicsService) {}

  // ── Courses ──
  @Post('courses')
  @Roles(...MANAGERS)
  createCourse(@CurrentUser() actor: AuthUser, @Body() dto: CreateCourseDto) {
    return this.academics.createCourse(actor, dto);
  }

  @Get('courses')
  listCourses(@CurrentUser() actor: AuthUser, @Query('centerId') centerId?: string) {
    return this.academics.listCourses(actor, centerId);
  }

  @Public()
  @Get('courses/slug/:slug')
  getCourseBySlug(@Param('slug') slug: string) {
    return this.academics.getCourseBySlug(slug);
  }

  @Get('courses/:id')
  getCourse(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.academics.getCourse(actor, id);
  }

  @Patch('courses/:id')
  @Roles(...MANAGERS)
  updateCourse(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.academics.updateCourse(actor, id, dto);
  }

  @Delete('courses/:id')
  @Roles(...MANAGERS)
  @HttpCode(HttpStatus.OK)
  deleteCourse(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.academics.deleteCourse(actor, id);
  }

  // ── Classes ──
  @Post('classes')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  createClass(@CurrentUser() actor: AuthUser, @Body() dto: CreateClassDto) {
    return this.academics.createClass(actor, dto);
  }

  @Get('classes')
  listClasses(@CurrentUser() actor: AuthUser, @Query('centerId') centerId?: string) {
    return this.academics.listClasses(actor, centerId);
  }

  @Get('classes/:id')
  getClass(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.academics.getClass(actor, id);
  }

  @Patch('classes/:id')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  updateClass(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
  ) {
    return this.academics.updateClass(actor, id, dto);
  }

  @Delete('classes/:id')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  @HttpCode(HttpStatus.OK)
  deleteClass(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.academics.deleteClass(actor, id);
  }

  // ── Subjects ──
  @Post('subjects')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  createSubject(@CurrentUser() actor: AuthUser, @Body() dto: CreateSubjectDto) {
    return this.academics.createSubject(actor, dto);
  }

  @Get('subjects')
  listSubjects(
    @CurrentUser() actor: AuthUser,
    @Query('centerId') centerId?: string,
    @Query('classId') classId?: string,
  ) {
    return this.academics.listSubjects(actor, centerId, classId);
  }

  @Get('subjects/:id')
  getSubject(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.academics.getSubject(actor, id);
  }

  @Patch('subjects/:id')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  updateSubject(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSubjectDto,
  ) {
    return this.academics.updateSubject(actor, id, dto);
  }

  @Delete('subjects/:id')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  @HttpCode(HttpStatus.OK)
  deleteSubject(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.academics.deleteSubject(actor, id);
  }
}
