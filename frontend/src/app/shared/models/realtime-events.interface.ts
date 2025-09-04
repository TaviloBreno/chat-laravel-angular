import { User } from './user.interface';

export interface TypingEvent {
  user: User;
  conversation_id: number;
  is_typing: boolean;
  timestamp: string;
}

export interface PresenceEvent {
  user: User;
  conversation_id: number;
  status: 'online' | 'offline';
  timestamp: string;
}

export interface MessageSentEvent {
  message: any; // Will be typed as Message when imported
  conversation_id: number;
}

export interface MessageReadEvent {
  message_id: number;
  user_id: number;
  conversation_id: number;
  read_at: string;
}