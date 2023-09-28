import { Injectable } from '@nestjs/common';
import { History, HistoryRecord, IHistoryService } from './IHistoryService';
import { TELEGRAM_CHAT_HISTORY_SIZE } from '../telegram.consts';

@Injectable()
export class HistoryService implements IHistoryService {
  private readonly messageHistory = new Map<number, History>();

  getAll(): History {
    return Array.from(this.messageHistory.values()).flat();
  }

  get(chatId: number): History {
    return this.messageHistory.get(chatId) ?? [];
  }

  add(chatId: number, ...records: HistoryRecord[]): History {
    const chatHistory = this.messageHistory.get(chatId) ?? [];

    chatHistory.push(...records.map((record) => ({ ...record, chatId })));

    if (chatHistory.length > TELEGRAM_CHAT_HISTORY_SIZE) {
      chatHistory.splice(0, chatHistory.length - TELEGRAM_CHAT_HISTORY_SIZE);
    }

    return this.messageHistory.set(chatId, chatHistory).get(chatId);
  }

  clear(chatId: number): void {
    this.messageHistory.delete(chatId);
  }
}
