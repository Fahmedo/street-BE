import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import * as streamifier from 'streamifier';
import { UploadedFile } from '../types/file-upload.interface';

@Injectable()
export class UploadService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadFile(file: UploadedFile): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: 'organizations/documents',
          resource_type: 'auto',
          allowed_formats: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          // Handle error
          if (error) {
            reject(error);
            return;
          }

          // Handle missing result
          if (!result) {
            reject(new InternalServerErrorException('Upload failed - no result returned'));
            return;
          }

          // Now TypeScript knows result is defined
          resolve(result.secure_url);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(upload);
    });
  }

  async deleteFile(url: string): Promise<void> {
    const publicId = this.extractPublicId(url);
    await cloudinary.uploader.destroy(publicId);
  }

  private extractPublicId(url: string): string {
    const parts = url.split('/');
    const filenameWithExtension = parts[parts.length - 1];
    const filename = filenameWithExtension.split('.')[0];
    return `organizations/documents/${filename}`;
  }
}