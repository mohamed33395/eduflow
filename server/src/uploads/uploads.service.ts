import {
  Injectable,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { extname } from 'path';
import { Readable } from 'stream';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { PresignDto } from './dto/uploads.dto';

const PRESIGN_TTL_SECONDS = 300; // 5 minutes

/** Max blob size stored as a Postgres row (use S3 for anything larger). */
const MAX_DB_BYTES = 50 * 1024 * 1024;

/** Sanitize filename to a safe S3 key segment, preserving the extension. */
function safeName(filename: string) {
  const ext = extname(filename).toLowerCase().replace(/[^\w.]/g, '');
  const base = filename
    .slice(0, filename.length - ext.length)
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w.\-]/g, '')
    .replace(/^\.+/, '')
    .slice(-70);
  return `${base || 'file'}${ext}`;
}

@Injectable()
export class UploadsService {
  private readonly s3?: S3Client;
  private readonly bucket?: string;
  private readonly publicBase?: string;
  private readonly localSecret: string;
  private readonly apiBase: string;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const endpoint = config.get<string>('S3_ENDPOINT');
    const accessKeyId = config.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('S3_SECRET_ACCESS_KEY');
    this.bucket = config.get<string>('S3_BUCKET');
    this.publicBase = config.get<string>('S3_PUBLIC_URL') ?? endpoint;

    this.localSecret =
      config.get<string>('UPLOAD_TOKEN_SECRET') ??
      config.get<string>('JWT_ACCESS_SECRET') ??
      'eduflow-uploads';
    const port = config.get<string>('PORT', '4000');
    this.apiBase =
      config.get<string>('API_PUBLIC_URL') ?? `http://localhost:${port}/api`;

    if (endpoint && accessKeyId && secretAccessKey && this.bucket) {
      this.s3 = new S3Client({
        endpoint,
        region: config.get<string>('S3_REGION', 'auto'),
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: true, // needed for MinIO/R2-style endpoints
      });
    }
  }

  /**
   * True when `url` is one of our own upload URLs (local /uploads/… or the
   * configured S3 public base). Used to reject foreign URLs stored on
   * entities (e.g. payment-proof screenshots).
   */
  isOwnedUrl(url: string): boolean {
    if (!url || typeof url !== 'string' || url.length > 1000) return false;
    const local = `${this.apiBase}/uploads/`;
    if (url.startsWith(local)) return true;
    const base = this.publicBase?.replace(/\/$/, '');
    if (base && url.startsWith(`${base}/`)) return true;
    return false;
  }

  /**
   * Issue a presigned PUT URL so the client uploads straight to S3/R2.
   * Returns { uploadUrl, publicUrl, key } — client PUTs the file to uploadUrl
   * then stores publicUrl on the entity (lesson file, avatar, submission…).
   */
  async presign(actor: AuthUser, dto: PresignDto) {
    const folder = dto.folder ?? 'misc';
    const scope = dto.scopeId ? `${dto.scopeId}/` : `${actor.id}/`;
    const key = `${folder}/${scope}${randomUUID()}-${safeName(dto.filename)}`;

    // Local-disk fallback when object storage isn't configured: the browser
    // PUTs the file to /uploads/local?key=…&token=<hmac> and it is served
    // back from GET /uploads/local?key=….
    if (!this.s3 || !this.bucket) {
      const token = this.signLocal(key);
      return {
        uploadUrl: `${this.apiBase}/uploads/local?key=${encodeURIComponent(key)}&token=${token}`,
        key,
        publicUrl: `${this.apiBase}/uploads/local?key=${encodeURIComponent(key)}`,
        expiresIn: PRESIGN_TTL_SECONDS,
      };
    }

    const uploadUrl = await getSignedUrl(
      this.s3,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: dto.contentType,
      }),
      { expiresIn: PRESIGN_TTL_SECONDS },
    );

    const base = this.publicBase?.replace(/\/$/, '');
    return {
      uploadUrl,
      key,
      publicUrl: base ? `${base}/${key}` : undefined,
      expiresIn: PRESIGN_TTL_SECONDS,
    };
  }

  // ── database blob fallback (files stored in Postgres, e.g. Neon) ──

  signLocal(key: string): string {
    return createHmac('sha256', this.localSecret).update(key).digest('hex');
  }

  verifyLocal(key: string, token: string): boolean {
    const expected = this.signLocal(key);
    return (
      expected.length === token.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(token))
    );
  }

  /** Reject keys that could escape the intended namespace. */
  private assertValidKey(key: string): void {
    if (
      !key.trim() ||
      key.includes('..') ||
      key.startsWith('/') ||
      key.startsWith('\\')
    ) {
      throw new ServiceUnavailableException('Invalid storage key');
    }
  }

  /** Buffer the request body and persist it as a `stored_files` row. */
  async saveLocal(
    key: string,
    source: Readable,
    contentType = 'application/octet-stream',
  ): Promise<void> {
    this.assertValidKey(key);
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of source) {
      const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
      size += b.length;
      if (size > MAX_DB_BYTES) {
        throw new PayloadTooLargeException(
          'File exceeds the 50MB database-storage limit',
        );
      }
      chunks.push(b);
    }
    const data = Buffer.concat(chunks);
    await this.prisma.storedFile.upsert({
      where: { key },
      create: { key, contentType, data, size },
      update: { contentType, data, size },
    });
  }

  /** Open a stored blob for reading — null when missing. */
  async openLocal(key: string) {
    this.assertValidKey(key);
    const row = await this.prisma.storedFile
      .findUnique({ where: { key } })
      .catch(() => null);
    if (!row) return null;
    return {
      stream: Readable.from([row.data]),
      contentType: row.contentType,
      filename: key.split('/').pop() ?? 'file',
    };
  }
}
