/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */

const TelegramBotCtor = require("node-telegram-bot-api") as TelegramBotConstructor;

export interface TgChat {
  id: number;
  type: string;
}

export interface TgUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TgAudio {
  file_id: string;
  file_unique_id: string;
  duration: number;
  performer?: string;
  title?: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TgDocument {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TgVoice {
  file_id: string;
  file_unique_id: string;
  duration: number;
}

export interface TgPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  date: number;
  text?: string;
  audio?: TgAudio;
  document?: TgDocument;
  voice?: TgVoice;
  photo?: TgPhotoSize[];
}

export interface TgCallbackQuery {
  id: string;
  from: TgUser;
  message?: TgMessage;
  data?: string;
}

export interface TgFile {
  file_id: string;
  file_path?: string;
}

export interface TgBotInstance {
  sendMessage(
    chatId: number | string,
    text: string,
    options?: Record<string, unknown>
  ): Promise<TgMessage>;
  sendAudio(
    chatId: number | string,
    audio: string | Buffer | NodeJS.ReadableStream,
    options?: Record<string, unknown>,
    fileOptions?: Record<string, unknown>
  ): Promise<TgMessage>;
  sendPhoto(
    chatId: number | string,
    photo: string | Buffer | NodeJS.ReadableStream,
    options?: Record<string, unknown>
  ): Promise<TgMessage>;
  getFile(fileId: string): Promise<TgFile>;
  getFileLink(fileId: string): Promise<string>;
  downloadFile(fileId: string, downloadDir: string): Promise<string>;
  answerCallbackQuery(queryId: string, options?: Record<string, unknown>): Promise<boolean>;
  onText(regexp: RegExp, callback: (msg: TgMessage, match: RegExpExecArray | null) => void): void;
  on(event: string, callback: (data: never) => void): void;
  stopPolling(): Promise<void>;
}

type TelegramBotConstructor = new (
  token: string,
  options?: { polling?: boolean; webhook?: boolean }
) => TgBotInstance;

export default TelegramBotCtor;
