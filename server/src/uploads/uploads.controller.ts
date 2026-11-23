import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { UploadsService } from './uploads.service';
import { Public } from '../common/decorators/public.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { PresignDto } from './dto/uploads.dto';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  /** Any authenticated user can request an upload URL for an allowed folder. */
  @Post('presign')
  presign(@CurrentUser() actor: AuthUser, @Body() dto: PresignDto) {
    return this.uploads.presign(actor, dto);
  }

  /**
   * Local-storage fallback (used when S3 isn't configured): the browser PUTs
   * the raw file here with the signed token from the presign response.
   */
  @Public()
  @Put('local')
  async putLocal(
    @Req() req: Request,
    @Res() res: Response,
    @Query('key') key?: string,
    @Query('token') token?: string,
  ) {
    if (!key || !token || !this.uploads.verifyLocal(key, token)) {
      throw new ForbiddenException('Invalid upload token');
    }
    try {
      await this.uploads.saveLocal(key, req, req.headers['content-type']);
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(400).json({ message: 'Upload failed' });
    }
  }

  /** Serve a file stored via the local fallback. */
  @Public()
  @Get('local')
  async getLocal(@Res() res: Response, @Query('key') key?: string) {
    if (!key) throw new NotFoundException();
    const file = await this.uploads.openLocal(key).catch(() => null);
    if (!file) throw new NotFoundException();
    // helmet's default CORP: same-origin blocks <img> embeds from the
    // frontend on another port — uploaded files are meant to be public.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.filename)}"`,
    );
    file.stream.pipe(res);
  }
}
