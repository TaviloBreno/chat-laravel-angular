import { User } from './user.interface';

export interface Message {
  id: number;
  body: string;
  type: 'text' | 'image' | 'file' | 'system';
  conversation_id: number;
  user: User;
  created_at: string;
  updated_at: string;
  edited_at?: string;
  deleted_at?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  read_receipts?: ReadReceipt[];
}

export interface SendMessageRequest {
  body: string;
  type: 'text' | 'image' | 'file';
  conversation_id: number;
  file?: File;
}

export interface UpdateMessageRequest {
  body: string;
}

export interface ReadReceipt {
  id: number;
  message_id: number;
  user_id: number;
  read_at: string;
}