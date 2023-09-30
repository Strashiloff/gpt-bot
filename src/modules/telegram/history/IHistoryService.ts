import { ChatCompletionRequestMessageRoleEnum } from 'openai';

export type HistoryRecord = {
  chatId: number;
  message: string;
  date: Date;
  role: ChatCompletionRequestMessageRoleEnum;
};

export type HistoryCreateRecord = Omit<HistoryRecord, 'chatId'>;

export type History = HistoryRecord[];

export const HISTORY_SERVICE_TOKEN = 'HISTORY_SERVICE_TOKEN';

export interface IHistoryService {
  getAll(): History;
  get(chatId: number): History;
  add(chatId: number, ...records: HistoryCreateRecord[]): History;
  clear(chatId: number): void;
}
