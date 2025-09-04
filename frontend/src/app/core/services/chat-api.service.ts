import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Conversation,
  CreateConversationRequest,
  Message,
  SendMessageRequest,
  UpdateMessageRequest,
  CursorPage,
  CursorPaginationParams
} from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class ChatApiService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  // Conversation endpoints
  getConversations(params?: CursorPaginationParams): Observable<CursorPage<Conversation>> {
    let httpParams = new HttpParams();
    if (params?.cursor) httpParams = httpParams.set('cursor', params.cursor);
    if (params?.per_page) httpParams = httpParams.set('per_page', params.per_page.toString());
    if (params?.direction) httpParams = httpParams.set('direction', params.direction);

    return this.http.get<CursorPage<Conversation>>(`${this.baseUrl}/conversations`, { params: httpParams });
  }

  getConversation(id: number): Observable<Conversation> {
    return this.http.get<Conversation>(`${this.baseUrl}/conversations/${id}`);
  }

  createConversation(data: CreateConversationRequest): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.baseUrl}/conversations`, data);
  }

  getConversationParticipants(conversationId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/conversations/${conversationId}/participants`);
  }

  addParticipant(conversationId: number, userId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/conversations/${conversationId}/participants`, { user_id: userId });
  }

  removeParticipant(conversationId: number, userId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/conversations/${conversationId}/participants/${userId}`);
  }

  // Message endpoints
  getMessages(conversationId: number, params?: CursorPaginationParams): Observable<CursorPage<Message>> {
    let httpParams = new HttpParams();
    if (params?.cursor) httpParams = httpParams.set('cursor', params.cursor);
    if (params?.per_page) httpParams = httpParams.set('per_page', params.per_page.toString());
    if (params?.direction) httpParams = httpParams.set('direction', params.direction);

    return this.http.get<CursorPage<Message>>(`${this.baseUrl}/conversations/${conversationId}/messages`, { params: httpParams });
  }

  sendMessage(data: SendMessageRequest): Observable<Message> {
    const formData = new FormData();
    formData.append('body', data.body);
    formData.append('type', data.type);
    formData.append('conversation_id', data.conversation_id.toString());
    
    if (data.file) {
      formData.append('file', data.file);
    }

    return this.http.post<Message>(`${this.baseUrl}/messages`, formData);
  }

  updateMessage(messageId: number, data: UpdateMessageRequest): Observable<Message> {
    return this.http.put<Message>(`${this.baseUrl}/messages/${messageId}`, data);
  }

  deleteMessage(messageId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/messages/${messageId}`);
  }

  markMessageAsRead(messageId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/messages/${messageId}/read`, {});
  }

  markMessagesAsRead(conversationId: number, messageIds: number[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/conversations/${conversationId}/messages/read`, { message_ids: messageIds });
  }

  // Typing indicators
  startTyping(conversationId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/conversations/${conversationId}/typing/start`, {});
  }

  stopTyping(conversationId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/conversations/${conversationId}/typing/stop`, {});
  }

  // File upload
  uploadFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.post(`${this.baseUrl}/upload`, formData);
  }

  // Search
  searchMessages(query: string, conversationId?: number): Observable<CursorPage<Message>> {
    let httpParams = new HttpParams().set('q', query);
    if (conversationId) {
      httpParams = httpParams.set('conversation_id', conversationId.toString());
    }

    return this.http.get<CursorPage<Message>>(`${this.baseUrl}/messages/search`, { params: httpParams });
  }

  searchConversations(query: string): Observable<CursorPage<Conversation>> {
    const httpParams = new HttpParams().set('q', query);
    return this.http.get<CursorPage<Conversation>>(`${this.baseUrl}/conversations/search`, { params: httpParams });
  }
}