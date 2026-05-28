import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { TranslationServiceClient } from '@google-cloud/translate';
import { GoogleGenAI, Type } from '@google/genai';
import { join } from 'path';
import { DATABASE_CONNECTION, hashtags, schema } from '@repo/database';
import { Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { inArray } from 'drizzle-orm';

@Injectable()
export class ModerationService implements OnModuleInit {
  private readonly logger = new Logger(ModerationService.name);
  private visionClient!: ImageAnnotatorClient;
  private translateClient!: TranslationServiceClient;
  private googleGenAI!: GoogleGenAI;
  private getCaptionPrompt(lang: string = 'en') {
    const languageName = lang === 'vi' ? 'Vietnamese' : 'English';
    return `
      As an AI content creator for a premium multimedia social network called Gigglegram, 
      write a single, captivating paragraph to be used as a post caption. 
      Analyze all the provided images and/or videos and synthesize their content into a 
      cohesive, engaging, and high-vibe narrative. 
      The paragraph should feel personal, authentic, and evocative. 
      Do not include hashtags, emojis, or any introductory text. 
      The caption MUST be written in ${languageName}.
      Just provide the single paragraph of caption.
    `;
  }

  private getHashtagsPrompt(existingHashtags: string[] = []) {
    const existingList =
      existingHashtags.length > 0
        ? `Here is a list of existing hashtags used on the platform: ${existingHashtags.join(', ')}.`
        : 'There are no existing hashtags provided.';

    return `
      As an AI trend specialist for Gigglegram, analyze the provided images and/or videos.
      Generate 3-5 highly relevant hashtags that describe the content, mood, and aesthetic.
      
      ${existingList}
      
      Rules:
      1. If an existing hashtag from the list above fits the content perfectly, prioritize using it.
      2. If the content contains unique elements not covered by existing hashtags, create new, creative hashtags.
      3. Do NOT include the '#' prefix in your response.
      4. Return ONLY a JSON array of strings.
    `;
  }

  constructor(
    private readonly configService: ConfigService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  onModuleInit() {
    const keyFileName = this.configService.get<string>(
      'GOOGLE_CS_SA_KEY_FILE_NAME',
    );
    let keyPath: string | undefined = undefined;

    if (keyFileName) {
      // Using join(__dirname, ...) to match the pattern in UploadService
      keyPath = join(__dirname, keyFileName);
    }

    const projectId = this.configService.getOrThrow('GOOGLE_PROJECT_ID');
    const location =
      this.configService.get('GOOGLE_LOCATION') || 'asia-southeast1';

    try {
      this.visionClient = new ImageAnnotatorClient({
        projectId,
        keyFilename: keyPath,
      });

      this.googleGenAI = new GoogleGenAI({
        vertexai: true,
        project: projectId,
        location: location,
        googleAuthOptions: {
          keyFilename: keyPath,
        },
      });

      this.translateClient = new TranslationServiceClient({
        projectId,
        keyFilename: keyPath,
      });

      this.logger.log('ModerationService initialized successfully');
    } catch (error) {
      this.logger.error(
        'Failed to initialize ModerationService clients',
        error,
      );
    }
  }

  /**
   * Checks if an image is safe using Google Cloud Vision SafeSearch.
   * @param fileName The path/name of the file in the bucket
   * @param bucketName The name of the GCS bucket
   */
  async checkImageSafety(
    fileName: string,
    bucketName: string,
  ): Promise<{ isSafe: boolean; details?: any }> {
    try {
      const gcsUri = `gs://${bucketName}/${fileName}`;
      const [result] = await this.visionClient.safeSearchDetection(gcsUri);
      const detections = result.safeSearchAnnotation;

      if (!detections) {
        return { isSafe: true };
      }

      // Flag as unsafe if Adult, Violence, or Racy are 'LIKELY' or 'VERY_LIKELY'
      const unsafeThresholds = ['LIKELY', 'VERY_LIKELY'];

      const isUnsafe =
        unsafeThresholds.includes(detections.adult as string) ||
        unsafeThresholds.includes(detections.violence as string) ||
        unsafeThresholds.includes(detections.racy as string);

      return {
        isSafe: !isUnsafe,
        details: detections,
      };
    } catch (error) {
      this.logger.error(`Error checking image safety for ${fileName}`, error);
      // Default to safe to avoid blocking UX on API errors, or handle as needed
      return { isSafe: true };
    }
  }

  /**
   * Checks if a video is safe using Gemini 1.5 Flash via @google/genai.
   * @param fileName The path/name of the file in the bucket
   * @param bucketName The name of the GCS bucket
   */
  async checkVideoSafety(
    fileName: string,
    bucketName: string,
  ): Promise<{
    isSafe: boolean;
    reason?: string;
    violationCategory?: string | null;
  }> {
    try {
      const gcsUri = `gs://${bucketName}/${fileName}`;

      const prompt = `
        Analyze this video for community guideline violations.
        Check specifically for:
        1. Harassment or bullying behavior.
        2. Gratuitous violence.
        3. Adult or sexually explicit content.
        
        Respond ONLY in valid JSON format: { "isSafe": boolean, "reason": string, "violationCategory": string | null }
      `;

      const result = await this.googleGenAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                fileData: {
                  fileUri: gcsUri,
                  mimeType: 'video/mp4', // Standard for Gigglegram uploads
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isSafe: { type: Type.BOOLEAN },
              reason: { type: Type.STRING },
              violationCategory: { type: Type.STRING, nullable: true },
            },
            required: ['isSafe', 'reason', 'violationCategory'],
          },
        },
      });

      const responseText = result.text;

      if (!responseText) {
        throw new Error('Empty response from Gemini');
      }

      // Extract JSON (handles cases where Gemini wraps in markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error('Could not parse JSON from Gemini response');
    } catch (error) {
      this.logger.error(`Error checking video safety for ${fileName}`, error);
      return { isSafe: true, reason: 'Moderation check failed to complete' };
    }
  }

  /**
   * Generates a creative single-paragraph caption based on provided media items.
   * @param mediaItems List of media to analyze
   */
  async generateCaptionFromMedia(
    mediaItems: { fileName: string; mimeType: string; bucketName: string }[],
    lang: string = 'en',
  ): Promise<string> {
    if (!mediaItems || mediaItems.length === 0) {
      return '';
    }

    try {
      const parts = mediaItems.map((item) => ({
        fileData: {
          fileUri: `gs://${item.bucketName}/${item.fileName}`,
          mimeType: item.mimeType,
        },
      }));

      const prompt = this.getCaptionPrompt(lang);

      const result = await this.googleGenAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }, ...parts],
          },
        ],
      });

      return result.text || '';
    } catch (error) {
      this.logger.error('Error generating caption from media', error);
      return '';
    }
  }

  /**
   * Generates a creative single-paragraph caption based on local media files (not yet uploaded).
   * @param files List of local files to analyze
   */
  async generateCaptionFromLocalMedia(
    files: Express.Multer.File[],
    lang: string = 'vi',
  ): Promise<string> {
    if (!files || files.length === 0) {
      return '';
    }

    try {
      const parts = files.map((file) => ({
        inlineData: {
          data: file.buffer.toString('base64'),
          mimeType: file.mimetype,
        },
      }));

      const result = await this.googleGenAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: this.getCaptionPrompt(lang) }, ...parts],
          },
        ],
      });

      return result.text || '';
    } catch (error) {
      this.logger.error('Error generating caption from local media', error);
      return '';
    }
  }

  /**
   * Generates relevant hashtags based on provided media items and enriches them with database IDs.
   * @param mediaItems List of media to analyze
   * @param existingHashtags Optional list of existing hashtags to prioritize in the prompt
   */
  async generateHashtagsFromMedia(
    mediaItems: { fileName: string; mimeType: string; bucketName: string }[],
    existingHashtags: string[] = [],
  ): Promise<{ id?: string; name: string; isNew: boolean }[]> {
    if (!mediaItems || mediaItems.length === 0) {
      return [];
    }

    try {
      const parts = mediaItems.map((item) => ({
        fileData: {
          fileUri: `gs://${item.bucketName}/${item.fileName}`,
          mimeType: item.mimeType,
        },
      }));

      const result = await this.googleGenAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: this.getHashtagsPrompt(existingHashtags) },
              ...parts,
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
      });

      const responseText = result.text;
      if (!responseText) return [];

      const suggestedNames: string[] = JSON.parse(responseText);
      if (suggestedNames.length === 0) return [];

      // Find existing hashtags in database
      const dbHashtags = await this.db
        .select()
        .from(hashtags)
        .where(inArray(hashtags.name, suggestedNames));

      // Map results to identify which are new
      return suggestedNames.map((name) => {
        const found = dbHashtags.find(
          (h) => h.name.toLowerCase() === name.toLowerCase(),
        );
        return {
          id: found?.id,
          name: found?.name || name,
          isNew: !found,
        };
      });
    } catch (error) {
      this.logger.error('Error generating hashtags from media', error);
      return [];
    }
  }

  /**
   * Generates relevant hashtags based on local media files and enriches them with database IDs.
   * @param files List of local files to analyze
   * @param existingHashtags Optional list of existing hashtags to prioritize in the prompt
   */
  async generateHashtagsFromLocalMedia(
    files: Express.Multer.File[],
    existingHashtags: string[] = [],
  ): Promise<{ id?: string; name: string; isNew: boolean }[]> {
    if (!files || files.length === 0) {
      return [];
    }

    try {
      const parts = files.map((file) => ({
        inlineData: {
          data: file.buffer.toString('base64'),
          mimeType: file.mimetype,
        },
      }));

      const result = await this.googleGenAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: this.getHashtagsPrompt(existingHashtags) },
              ...parts,
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
      });

      const responseText = result.text;
      if (!responseText) return [];

      const suggestedNames: string[] = JSON.parse(responseText);
      if (suggestedNames.length === 0) return [];

      // Find existing hashtags in database
      const dbHashtags = await this.db
        .select()
        .from(hashtags)
        .where(inArray(hashtags.name, suggestedNames));

      // Map results to identify which are new
      return suggestedNames.map((name) => {
        const found = dbHashtags.find(
          (h) => h.name.toLowerCase() === name.toLowerCase(),
        );
        return {
          id: found?.id,
          name: found?.name || name,
          isNew: !found,
        };
      });
    } catch (error) {
      this.logger.error('Error generating hashtags from local media', error);
      return [];
    }
  }

  async translateText(
    text: string,
    targetLanguageCode: string,
    sourceLanguageCode?: string,
  ): Promise<string> {
    try {
      const projectId = this.configService.getOrThrow('GOOGLE_PROJECT_ID');
      const location = 'global';

      // 1. Find the first <span (usually the start of hashtags) and add a space before it
      const processedText = text.replace('<span', ' <span');

      const request = {
        parent: `projects/${projectId}/locations/${location}`,
        contents: [processedText],
        mimeType: 'text/plain',
        sourceLanguageCode,
        targetLanguageCode,
      };

      const results = await this.translateClient.translateText(request);
      const response = results[0];

      if (
        !response ||
        !response.translations ||
        response.translations.length === 0
      ) {
        throw new Error('No translation returned from Google Translate API');
      }

      const translatedText = response.translations[0]?.translatedText;
      if (typeof translatedText !== 'string') {
        throw new Error('Translated text is empty or invalid');
      }

      return translatedText;
    } catch (error) {
      this.logger.error(
        `Failed to translate text to ${targetLanguageCode}`,
        error,
      );
      throw error;
    }
  }

  async detectLanguage(text: string): Promise<string> {
    try {
      const projectId = this.configService.getOrThrow('GOOGLE_PROJECT_ID');
      const location = 'global';

      const [response] = await this.translateClient.detectLanguage({
        parent: `projects/${projectId}/locations/${location}`,
        content: text,
        mimeType: 'text/plain',
      });

      return response.languages?.[0]?.languageCode || 'en';
    } catch (error) {
      this.logger.error('Language detection failed', error);
      return 'en';
    }
  }
}
