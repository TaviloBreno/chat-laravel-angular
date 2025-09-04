import { User } from './user.interface';
import { Message } from './message.interface';

export interface Conversation {
  id: number;
  name?: string;
  type: 'private' | 'group';
  created_at: string;
  updated_at: string;
  participants: ConversationParticipant[];
  last_message?: Message;
  unread_count?: number;
}

export interface ConversationParticipant {
  id: number;
  user: User;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface CreateConversationRequest {
  name?: string;
  type: 'private' | 'group';
  participant_ids: number[];
}