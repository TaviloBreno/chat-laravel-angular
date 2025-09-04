import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { Message } from '../../../../shared/models';

@Component({
  selector: 'app-message-item',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatChipsModule,
    MatTooltipModule,
    MatDividerModule
  ],
  template: `
    <div 
      class="message-item"
      [class.own]="isOwn"
      [class.grouped]="isGrouped"
      [class.system]="message.type === 'system'"
    >
      <!-- Avatar (for other users) -->
      <div *ngIf="!isOwn && showAvatar" class="message-avatar">
        <div class="avatar">
          {{ getUserInitials(message.user?.name || 'U') }}
        </div>
      </div>
      
      <!-- Spacer for grouped messages -->
      <div *ngIf="!isOwn && !showAvatar" class="avatar-spacer"></div>
      
      <!-- Message Content -->
      <div class="message-content">
        <!-- User Name (for group chats and other users) -->
        <div *ngIf="!isOwn && showAvatar && !isGrouped" class="message-sender">
          {{ message.user?.name || 'Usuário' }}
        </div>
        
        <!-- Message Bubble -->
        <div 
          class="message-bubble"
          [class.text]="message.type === 'text'"
          [class.file]="message.type === 'file'"
          [class.system]="message.type === 'system'"
          [class.edited]="message.edited_at"
        >
          <!-- Text Message -->
          <div *ngIf="message.type === 'text'" class="text-content">
            <p [innerHTML]="formatMessageText(message.body || '')"></p>
          </div>
          
          <!-- File Message -->
          <div *ngIf="message.type === 'file'" class="file-content">
            <div class="file-info">
              <mat-icon class="file-icon">{{ getFileIcon(message.file_name || '') }}</mat-icon>
              <div class="file-details">
                <span class="file-name">{{ message.file_name || 'Arquivo' }}</span>
                <span class="file-size">{{ formatFileSize(message.file_size || 0) }}</span>
              </div>
            </div>
            <button 
              mat-icon-button 
              class="download-button"
              (click)="downloadFile()"
              matTooltip="Baixar arquivo"
            >
              <mat-icon>download</mat-icon>
            </button>
          </div>
          
          <!-- System Message -->
          <div *ngIf="message.type === 'system'" class="system-content">
            <mat-icon class="system-icon">info</mat-icon>
            <span>{{ message.body }}</span>
          </div>
          
          <!-- Message Actions -->
          <div *ngIf="message.type !== 'system'" class="message-actions">
            <button 
              mat-icon-button 
              class="action-button"
              [matMenuTriggerFor]="messageMenu"
              matTooltip="Mais opções"
            >
              <mat-icon>more_vert</mat-icon>
            </button>
            
            <mat-menu #messageMenu="matMenu">
              <!-- Reply -->
              <button mat-menu-item (click)="replyToMessage()">
                <mat-icon>reply</mat-icon>
                <span>Responder</span>
              </button>
              
              <!-- Forward -->
              <button mat-menu-item (click)="forwardMessage()">
                <mat-icon>forward</mat-icon>
                <span>Encaminhar</span>
              </button>
              
              <!-- Copy -->
              <button 
                mat-menu-item 
                (click)="copyMessage()"
                *ngIf="message.type === 'text'"
              >
                <mat-icon>content_copy</mat-icon>
                <span>Copiar</span>
              </button>
              
              <mat-divider *ngIf="isOwn"></mat-divider>
              
              <!-- Edit (own messages only) -->
              <button 
                mat-menu-item 
                (click)="editMessage()"
                *ngIf="isOwn && message.type === 'text'"
              >
                <mat-icon>edit</mat-icon>
                <span>Editar</span>
              </button>
              
              <!-- Delete (own messages only) -->
              <button 
                mat-menu-item 
                (click)="deleteMessage()"
                *ngIf="isOwn"
                class="delete-option"
              >
                <mat-icon>delete</mat-icon>
                <span>Excluir</span>
              </button>
            </mat-menu>
          </div>
        </div>
        
        <!-- Message Reactions -->
        <div *ngIf="hasReactions()" class="message-reactions">
          <mat-chip-set>
            <mat-chip 
              *ngFor="let reaction of getReactions()"
              (click)="toggleReaction(reaction.emoji)"
              [class.selected]="hasUserReacted(reaction.emoji)"
            >
              {{ reaction.emoji }} {{ reaction.count }}
            </mat-chip>
          </mat-chip-set>
          <button 
            mat-icon-button 
            class="add-reaction"
            (click)="showReactionPicker()"
            matTooltip="Adicionar reação"
          >
            <mat-icon>add_reaction</mat-icon>
          </button>
        </div>
        
        <!-- Add Reaction Button (when no reactions) -->
        <button 
          *ngIf="!hasReactions() && message.type !== 'system'"
          mat-icon-button 
          class="add-reaction-button"
          (click)="showReactionPicker()"
          matTooltip="Adicionar reação"
        >
          <mat-icon>add_reaction</mat-icon>
        </button>
        
        <!-- Message Timestamp and Status -->
        <div *ngIf="showTimestamp" class="message-footer">
          <span class="message-time">{{ formatTime(message.created_at) }}</span>
          <span *ngIf="message.edited_at" class="edited-indicator">(editada)</span>
          
          <!-- Message Status (for own messages) -->
          <div *ngIf="isOwn" class="message-status">
            <mat-icon 
              class="status-icon"
              [class.sent]="getMessageStatus() === 'sent'"
              [class.delivered]="getMessageStatus() === 'delivered'"
              [class.read]="getMessageStatus() === 'read'"
              [matTooltip]="getStatusTooltip()"
            >
              {{ getStatusIcon() }}
            </mat-icon>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .message-item {
      display: flex;
      margin-bottom: 8px;
      padding: 0 16px;
      position: relative;
    }
    
    .message-item.grouped {
      margin-bottom: 2px;
    }
    
    .message-item.own {
      flex-direction: row-reverse;
    }
    
    .message-item.system {
      justify-content: center;
      margin: 16px 0;
    }
    
    .message-avatar {
      flex-shrink: 0;
      margin-right: 8px;
    }
    
    .message-item.own .message-avatar {
      margin-right: 0;
      margin-left: 8px;
    }
    
    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #2196f3;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 500;
    }
    
    .avatar-spacer {
      width: 40px;
      flex-shrink: 0;
    }
    
    .message-content {
      max-width: 70%;
      min-width: 0;
    }
    
    .message-item.own .message-content {
      align-items: flex-end;
    }
    
    .message-item.system .message-content {
      max-width: none;
    }
    
    .message-sender {
      font-size: 12px;
      color: #666;
      margin-bottom: 2px;
      font-weight: 500;
    }
    
    .message-bubble {
      position: relative;
      border-radius: 18px;
      padding: 8px 16px;
      word-wrap: break-word;
      background: white;
      border: 1px solid #e0e0e0;
    }
    
    .message-item.own .message-bubble {
      background: #2196f3;
      color: white;
      border-color: #2196f3;
    }
    
    .message-bubble.system {
      background: #f5f5f5;
      border-color: #e0e0e0;
      border-radius: 12px;
      padding: 8px 12px;
    }
    
    .message-bubble.edited {
      border-left: 3px solid #ff9800;
    }
    
    .message-item.own .message-bubble.edited {
      border-left: 3px solid rgba(255, 255, 255, 0.7);
    }
    
    .text-content p {
      margin: 0;
      line-height: 1.4;
      font-size: 14px;
    }
    
    .file-content {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 200px;
    }
    
    .file-info {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
    }
    
    .file-icon {
      color: #666;
    }
    
    .message-item.own .file-icon {
      color: rgba(255, 255, 255, 0.8);
    }
    
    .file-details {
      display: flex;
      flex-direction: column;
    }
    
    .file-name {
      font-size: 14px;
      font-weight: 500;
    }
    
    .file-size {
      font-size: 12px;
      opacity: 0.7;
    }
    
    .download-button {
      color: #666;
    }
    
    .message-item.own .download-button {
      color: rgba(255, 255, 255, 0.8);
    }
    
    .system-content {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #666;
    }
    
    .system-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    
    .message-actions {
      position: absolute;
      top: -8px;
      right: -8px;
      opacity: 0;
      transition: opacity 0.2s;
    }
    
    .message-item.own .message-actions {
      right: auto;
      left: -8px;
    }
    
    .message-item:hover .message-actions {
      opacity: 1;
    }
    
    .action-button {
      width: 24px;
      height: 24px;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .action-button mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    
    .message-reactions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }
    
    .message-reactions mat-chip {
      font-size: 12px;
      height: 24px;
      cursor: pointer;
    }
    
    .message-reactions mat-chip.selected {
      background: #e3f2fd;
      color: #2196f3;
    }
    
    .add-reaction {
      width: 24px;
      height: 24px;
      opacity: 0.6;
    }
    
    .add-reaction mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    
    .add-reaction-button {
      width: 24px;
      height: 24px;
      margin-top: 4px;
      opacity: 0;
      transition: opacity 0.2s;
    }
    
    .message-item:hover .add-reaction-button {
      opacity: 0.6;
    }
    
    .add-reaction-button mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    
    .message-footer {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
      font-size: 11px;
      color: #999;
    }
    
    .message-item.own .message-footer {
      justify-content: flex-end;
    }
    
    .message-time {
      white-space: nowrap;
    }
    
    .edited-indicator {
      font-style: italic;
      opacity: 0.7;
    }
    
    .message-status {
      display: flex;
      align-items: center;
    }
    
    .status-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      margin-left: 4px;
    }
    
    .status-icon.sent {
      color: #999;
    }
    
    .status-icon.delivered {
      color: #2196f3;
    }
    
    .status-icon.read {
      color: #4caf50;
    }
    
    .delete-option {
      color: #f44336;
    }
    
    .delete-option mat-icon {
      color: #f44336;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      .message-content {
        max-width: 85%;
      }
      
      .message-item {
        padding: 0 12px;
      }
    }
  `]
})
export class MessageItemComponent implements OnInit {
  @Input() message!: Message;
  @Input() isOwn = false;
  @Input() showAvatar = true;
  @Input() showTimestamp = true;
  @Input() isGrouped = false;
  
  @Output() messageDeleted = new EventEmitter<number>();
  @Output() messageEdited = new EventEmitter<Message>();
  @Output() reactionAdded = new EventEmitter<{ messageId: number, reaction: string }>();

  constructor() {}

  ngOnInit(): void {
    // Component initialization
  }

  getUserInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  formatMessageText(text: string): string {
    // Basic text formatting - convert URLs to links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'picture_as_pdf';
      case 'doc':
      case 'docx':
        return 'description';
      case 'xls':
      case 'xlsx':
        return 'table_chart';
      case 'ppt':
      case 'pptx':
        return 'slideshow';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'image';
      case 'mp4':
      case 'avi':
      case 'mov':
        return 'movie';
      case 'mp3':
      case 'wav':
        return 'audio_file';
      case 'zip':
      case 'rar':
        return 'archive';
      default:
        return 'attach_file';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  hasReactions(): boolean {
    // This would check if the message has reactions
    // For now, return false as placeholder
    return false;
  }

  getReactions(): Array<{ emoji: string, count: number }> {
    // This would return the message reactions
    // For now, return empty array as placeholder
    return [];
  }

  hasUserReacted(emoji: string): boolean {
    // This would check if current user has reacted with this emoji
    // For now, return false as placeholder
    return false;
  }

  getMessageStatus(): 'sent' | 'delivered' | 'read' {
    // This would determine message status based on read receipts
    // For now, return 'sent' as placeholder
    return 'sent';
  }

  getStatusIcon(): string {
    const status = this.getMessageStatus();
    switch (status) {
      case 'sent':
        return 'check';
      case 'delivered':
        return 'done_all';
      case 'read':
        return 'done_all';
      default:
        return 'schedule';
    }
  }

  getStatusTooltip(): string {
    const status = this.getMessageStatus();
    switch (status) {
      case 'sent':
        return 'Enviada';
      case 'delivered':
        return 'Entregue';
      case 'read':
        return 'Lida';
      default:
        return 'Enviando...';
    }
  }

  // Event handlers
  downloadFile(): void {
    // Implement file download logic
    console.log('Download file:', this.message.file_name);
  }

  replyToMessage(): void {
    // Implement reply logic
    console.log('Reply to message:', this.message.id);
  }

  forwardMessage(): void {
    // Implement forward logic
    console.log('Forward message:', this.message.id);
  }

  copyMessage(): void {
    if (this.message.body) {
      navigator.clipboard.writeText(this.message.body);
    }
  }

  editMessage(): void {
    // Implement edit logic
    console.log('Edit message:', this.message.id);
  }

  deleteMessage(): void {
    if (confirm('Tem certeza que deseja excluir esta mensagem?')) {
      this.messageDeleted.emit(this.message.id);
    }
  }

  toggleReaction(emoji: string): void {
    this.reactionAdded.emit({ messageId: this.message.id, reaction: emoji });
  }

  showReactionPicker(): void {
    // Implement reaction picker logic
    console.log('Show reaction picker for message:', this.message.id);
  }
}