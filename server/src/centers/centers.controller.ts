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
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CentersService } from './centers.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import {
  CreateBillingDto,
  CreateCenterDto,
  CreateYearPackageDto,
  UpdateBillingDto,
  UpdateCenterDto,
  UpdateCenterSettingsDto,
} from './dto/centers.dto';

@Controller('centers')
export class CentersController {
  constructor(private readonly centers: CentersService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateCenterDto) {
    return this.centers.create(actor, dto);
  }

  @Get()
  list(@CurrentUser() actor: AuthUser) {
    return this.centers.list(actor);
  }

  /** Public lookup by slug for the marketing/join page. */
  @Public()
  @Get('slug/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.centers.getBySlug(slug);
  }

  @Get(':id')
  get(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.centers.get(actor, id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCenterDto,
  ) {
    return this.centers.update(actor, id, dto);
  }

  // ── Platform billing (super admin) ──
  @Get(':id/billings')
  @Roles(Role.SUPER_ADMIN)
  listBillings(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.centers.listBillings(actor, id);
  }

  @Post(':id/billings')
  @Roles(Role.SUPER_ADMIN)
  createBilling(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateBillingDto,
  ) {
    return this.centers.createBilling(actor, id, dto);
  }

  @Patch(':id/billings/:billingId')
  @Roles(Role.SUPER_ADMIN)
  updateBilling(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Param('billingId') billingId: string,
    @Body() dto: UpdateBillingDto,
  ) {
    return this.centers.updateBilling(actor, id, billingId, dto);
  }

  @Put(':id/settings')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  updateSettings(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCenterSettingsDto,
  ) {
    return this.centers.updateSettings(actor, id, dto);
  }

  @Post(':id/year-packages')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  createYearPackage(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateYearPackageDto,
  ) {
    return this.centers.createYearPackage(actor, id, dto);
  }

  @Delete(':id/year-packages/:packageId')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  @HttpCode(HttpStatus.OK)
  deleteYearPackage(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Param('packageId') packageId: string,
  ) {
    return this.centers.deleteYearPackage(actor, id, packageId);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  @HttpCode(HttpStatus.OK)
  deactivate(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.centers.deactivate(actor, id);
  }
}
