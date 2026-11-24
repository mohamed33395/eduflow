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
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { LandingRequestsService } from './landing-requests.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import {
  CreateLandingRequestDto,
  UpdateLandingRequestStatusDto,
} from './landing-requests.dto';

const MANAGERS = [Role.SUPER_ADMIN, Role.CENTER_OWNER, Role.COURSE_OWNER];

@Controller('landing-requests')
export class LandingRequestsController {
  constructor(private readonly requests: LandingRequestsService) {}

  /** Public booking form on the landing pages posts here (no auth). */
  @Public()
  @Post()
  create(@Body() dto: CreateLandingRequestDto) {
    return this.requests.create(dto);
  }

  @Get()
  @Roles(...MANAGERS)
  list(@CurrentUser() actor: AuthUser) {
    return this.requests.list(actor);
  }

  @Patch(':id')
  @Roles(...MANAGERS)
  updateStatus(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateLandingRequestStatusDto,
  ) {
    return this.requests.updateStatus(actor, id, dto);
  }

  @Delete(':id')
  @Roles(...MANAGERS)
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.requests.remove(actor, id);
  }
}
