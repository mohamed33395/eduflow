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
import { LearningService } from './learning.service';
import { Roles } from '../common/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import {
  CreateAssignmentDto,
  CreateLessonDto,
  CreateSubmissionDto,
  GradeSubmissionDto,
  UpdateAssignmentDto,
  UpdateLessonDto,
} from './dto/learning.dto';

const CONTENT_MANAGERS = [
  Role.SUPER_ADMIN,
  Role.CENTER_OWNER,
  Role.COURSE_OWNER,
  Role.TEACHER,
];

@Controller()
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  // ── Lessons ──
  @Get('courses/:courseId/lessons')
  listLessons(@CurrentUser() actor: AuthUser, @Param('courseId') courseId: string) {
    return this.learning.listLessons(actor, courseId);
  }

  @Post('lessons')
  @Roles(...CONTENT_MANAGERS)
  createLesson(@CurrentUser() actor: AuthUser, @Body() dto: CreateLessonDto) {
    return this.learning.createLesson(actor, dto);
  }

  @Patch('lessons/:id')
  @Roles(...CONTENT_MANAGERS)
  updateLesson(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.learning.updateLesson(actor, id, dto);
  }

  @Delete('lessons/:id')
  @Roles(...CONTENT_MANAGERS)
  @HttpCode(HttpStatus.OK)
  deleteLesson(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.learning.deleteLesson(actor, id);
  }

  // ── Assignments ──
  @Get('courses/:courseId/assignments')
  listAssignments(
    @CurrentUser() actor: AuthUser,
    @Param('courseId') courseId: string,
  ) {
    return this.learning.listAssignments(actor, courseId);
  }

  @Get('assignments/:id')
  getAssignment(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.learning.getAssignment(actor, id);
  }

  @Post('assignments')
  @Roles(...CONTENT_MANAGERS)
  createAssignment(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.learning.createAssignment(actor, dto);
  }

  @Patch('assignments/:id')
  @Roles(...CONTENT_MANAGERS)
  updateAssignment(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.learning.updateAssignment(actor, id, dto);
  }

  @Delete('assignments/:id')
  @Roles(...CONTENT_MANAGERS)
  @HttpCode(HttpStatus.OK)
  deleteAssignment(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.learning.deleteAssignment(actor, id);
  }

  // ── Submissions ──
  @Get('submissions')
  listSubmissionsByStudent(
    @CurrentUser() actor: AuthUser,
    @Query('studentId') studentId?: string,
  ) {
    return this.learning.listSubmissionsByStudent(actor, studentId);
  }

  @Get('assignments/:assignmentId/submissions')
  listSubmissions(
    @CurrentUser() actor: AuthUser,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.learning.listSubmissions(actor, assignmentId);
  }

  @Post('assignments/:assignmentId/submissions')
  @Roles(Role.STUDENT)
  submit(
    @CurrentUser() actor: AuthUser,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: CreateSubmissionDto,
  ) {
    return this.learning.submit(actor, assignmentId, dto);
  }

  @Patch('submissions/:id/grade')
  @Roles(...CONTENT_MANAGERS)
  grade(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: GradeSubmissionDto,
  ) {
    return this.learning.grade(actor, id, dto);
  }
}
