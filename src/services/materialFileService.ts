import { supabase } from '../lib/supabase';

interface SignedUrlOptions {
  expiresIn?: number;
}

interface SignedUrlResult {
  url: string;
  expiresAt: Date;
  error?: string;
}

export class MaterialFileService {
  private static readonly DEFAULT_EXPIRY_SECONDS = 3600;
  private static readonly VIDEO_EXPIRY_SECONDS = 7200;
  private static signedUrlCache: Map<string, SignedUrlResult> = new Map();

  static async getSignedUrl(
    filePath: string,
    bucket: string = 'materials_files',
    options: SignedUrlOptions = {}
  ): Promise<SignedUrlResult> {
    const cacheKey = `${bucket}:${filePath}`;
    const cached = this.signedUrlCache.get(cacheKey);

    if (cached && this.isUrlStillValid(cached.expiresAt)) {
      return cached;
    }

    try {
      const expiresIn = options.expiresIn || this.DEFAULT_EXPIRY_SECONDS;

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('Error creating signed URL:', error);
        return {
          url: '',
          expiresAt: new Date(),
          error: error.message,
        };
      }

      if (!data?.signedUrl) {
        return {
          url: '',
          expiresAt: new Date(),
          error: 'No signed URL returned',
        };
      }

      const result: SignedUrlResult = {
        url: data.signedUrl,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      };

      this.signedUrlCache.set(cacheKey, result);

      setTimeout(() => {
        this.signedUrlCache.delete(cacheKey);
      }, (expiresIn - 60) * 1000);

      return result;
    } catch (error) {
      console.error('Exception creating signed URL:', error);
      return {
        url: '',
        expiresAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async getVideoSignedUrl(filePath: string): Promise<SignedUrlResult> {
    return this.getSignedUrl(filePath, 'materials_files', {
      expiresIn: this.VIDEO_EXPIRY_SECONDS,
    });
  }

  static async getDocumentSignedUrl(filePath: string): Promise<SignedUrlResult> {
    return this.getSignedUrl(filePath, 'materials_files', {
      expiresIn: this.DEFAULT_EXPIRY_SECONDS,
    });
  }

  static async refreshSignedUrl(
    filePath: string,
    bucket: string = 'materials_files'
  ): Promise<SignedUrlResult> {
    const cacheKey = `${bucket}:${filePath}`;
    this.signedUrlCache.delete(cacheKey);
    return this.getSignedUrl(filePath, bucket);
  }

  private static isUrlStillValid(expiresAt: Date): boolean {
    const bufferSeconds = 60;
    const expiresWithBuffer = new Date(expiresAt.getTime() - bufferSeconds * 1000);
    return expiresWithBuffer > new Date();
  }

  static clearCache(): void {
    this.signedUrlCache.clear();
  }

  static getFileTypeFromMimeType(mimeType: string): string {
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      return 'word';
    }
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel'
    ) {
      return 'excel';
    }
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      mimeType === 'application/vnd.ms-powerpoint'
    ) {
      return 'powerpoint';
    }
    return 'other';
  }

  static needsSignedUrl(fileType: string): boolean {
    return ['video', 'word', 'excel', 'powerpoint', 'pdf', 'audio'].includes(fileType);
  }

  static async downloadFile(filePath: string, fileName: string): Promise<void> {
    try {
      const signedUrlResult = await this.getSignedUrl(filePath);

      if (signedUrlResult.error) {
        throw new Error(signedUrlResult.error);
      }

      const response = await fetch(signedUrlResult.url);

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const blob = await response.blob();

      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }
}

export default MaterialFileService;
