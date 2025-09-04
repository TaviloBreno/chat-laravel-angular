import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { ChatApiService } from '../../../../core/services/chat-api.service';
import { TypingService } from '../../../../core/services/typing.service';
import { Conversation, Message, SendMessageRequest } from '../../../../shared/models';

@Component({
  selector: 'app-composer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="composer-container" *ngIf="conversation">
      <!-- File Upload Progress -->
      <div *ngIf="uploadProgress > 0 && uploadProgress < 100" class="upload-progress">
        <mat-progress-bar [value]="uploadProgress"></mat-progress-bar>
        <span class="progress-text">Enviando arquivo... {{ uploadProgress }}%</span>
        <button mat-icon-button (click)="cancelUpload()" class="cancel-upload">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      
      <!-- Reply Preview -->
      <div *ngIf="replyingTo" class="reply-preview">
        <div class="reply-content">
          <div class="reply-header">
            <mat-icon>reply</mat-icon>
            <span>Respondendo a {{ replyingTo.user?.name }}</span>
          </div>
          <div class="reply-message">{{ getReplyPreview(replyingTo) }}</div>
        </div>
        <button mat-icon-button (click)="cancelReply()" class="cancel-reply">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      
      <!-- Typing Indicator -->
      <div *ngIf="showTypingIndicator && typingUsers.length > 0" class="typing-indicator">
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span class="typing-text">
          {{ getTypingText() }}
        </span>
      </div>
      
      <!-- Main Composer -->
      <div class="composer-main">
        <!-- Attachment Button -->
        <button 
          mat-icon-button 
          class="attachment-button"
          [matMenuTriggerFor]="attachmentMenu"
          matTooltip="Anexar arquivo (Ctrl+U)"
          [disabled]="sending"
        >
          <mat-icon>attach_file</mat-icon>
        </button>
        
        <mat-menu #attachmentMenu="matMenu">
          <button mat-menu-item (click)="selectFile('image')">
            <mat-icon>image</mat-icon>
            <span>Imagem</span>
          </button>
          <button mat-menu-item (click)="selectFile('document')">
            <mat-icon>description</mat-icon>
            <span>Documento</span>
          </button>
          <button mat-menu-item (click)="selectFile('any')">
            <mat-icon>attach_file</mat-icon>
            <span>Qualquer arquivo</span>
          </button>
        </mat-menu>
        
        <!-- Message Input -->
        <div class="message-input-container">
          <mat-form-field appearance="outline" class="message-field">
            <textarea 
              matInput
              #messageInput
              [(ngModel)]="messageText"
              (keydown)="onKeyDown($event)"
              (input)="onInput()"
              (focus)="onFocus()"
              (blur)="onBlur()"
              placeholder="Digite uma mensagem... (Enter: enviar, Shift+Enter: nova linha, Esc: limpar, Ctrl+K: emoji, Ctrl+U: anexar)"
              rows="1"
              [disabled]="sending"
              class="message-textarea"
            ></textarea>
          </mat-form-field>
          
          <!-- Emoji Button -->
          <button 
            mat-icon-button 
            class="emoji-button"
            (click)="toggleEmojiPicker()"
            matTooltip="Adicionar emoji (Ctrl+K)"
            [disabled]="sending"
          >
            <mat-icon>emoji_emotions</mat-icon>
          </button>
        </div>
        
        <!-- Send Button -->
        <button 
          mat-fab 
          class="send-button"
          [disabled]="!canSend() || sending"
          (click)="sendMessage()"
          color="primary"
          matTooltip="Enviar mensagem"
        >
          <mat-icon *ngIf="!sending">send</mat-icon>
          <mat-icon *ngIf="sending" class="sending-icon">hourglass_empty</mat-icon>
        </button>
      </div>
      
      <!-- Emoji Picker (Simple) -->
      <div *ngIf="showEmojiPicker" class="emoji-picker">
        <div class="emoji-grid">
          <button 
            *ngFor="let emoji of commonEmojis"
            class="emoji-item"
            (click)="insertEmoji(emoji)"
          >
            {{ emoji }}
          </button>
        </div>
        <div class="emoji-picker-footer">
          <button mat-button (click)="toggleEmojiPicker()">Fechar</button>
        </div>
      </div>
    </div>
    
    <!-- Hidden File Input -->
    <input 
      #fileInput
      type="file"
      (change)="onFileSelected($event)"
      [accept]="fileAccept"
      style="display: none;"
      multiple
    >
  `,
  styles: [`
    .composer-container {
      background: white;
      border-top: 1px solid #e0e0e0;
      padding: 16px;
    }
    
    .upload-progress {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      padding: 8px 12px;
      background: #f5f5f5;
      border-radius: 8px;
    }
    
    .upload-progress mat-progress-bar {
      flex: 1;
    }
    
    .progress-text {
      font-size: 12px;
      color: #666;
      white-space: nowrap;
    }
    
    .cancel-upload {
      width: 24px;
      height: 24px;
    }
    
    .cancel-upload mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    
    .reply-preview {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
      padding: 12px;
      background: #f8f9fa;
      border-left: 3px solid #2196f3;
      border-radius: 0 8px 8px 0;
    }
    
    .reply-content {
      flex: 1;
      min-width: 0;
    }
    
    .reply-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #2196f3;
      font-weight: 500;
      margin-bottom: 4px;
    }
    
    .reply-header mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    
    .reply-message {
      font-size: 13px;
      color: #666;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .cancel-reply {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }
    
    .cancel-reply mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    
    .composer-main {
      display: flex;
      align-items: flex-end;
      gap: 12px;
    }
    
    .attachment-button {
      flex-shrink: 0;
      margin-bottom: 8px;
    }
    
    .message-input-container {
      flex: 1;
      display: flex;
      align-items: flex-end;
      gap: 8px;
    }
    
    .message-field {
      flex: 1;
    }
    
    .message-field .mat-mdc-form-field-wrapper {
      padding-bottom: 0;
    }
    
    .message-textarea {
      resize: none;
      min-height: 20px;
      max-height: 120px;
      overflow-y: hidden;
      line-height: 1.4;
      transition: height 0.2s ease;
      font-family: inherit;
      font-size: 14px;
    }
    
    .typing-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #f8f9fa;
      border-radius: 12px;
      margin-bottom: 8px;
      font-size: 13px;
      color: #666;
      animation: fadeIn 0.3s ease;
    }
    
    .typing-dots {
      display: flex;
      gap: 3px;
    }
    
    .typing-dots span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #999;
      animation: typingDot 1.4s infinite ease-in-out;
    }
    
    .typing-dots span:nth-child(1) {
      animation-delay: -0.32s;
    }
    
    .typing-dots span:nth-child(2) {
      animation-delay: -0.16s;
    }
    
    @keyframes typingDot {
      0%, 80%, 100% {
        transform: scale(0.8);
        opacity: 0.5;
      }
      40% {
        transform: scale(1);
        opacity: 1;
      }
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .emoji-button {
      flex-shrink: 0;
      margin-bottom: 8px;
    }
    
    .send-button {
      width: 48px;
      height: 48px;
      flex-shrink: 0;
    }
    
    .sending-icon {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .emoji-picker {
      position: absolute;
      bottom: 100%;
      right: 60px;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      width: 280px;
      max-height: 200px;
    }
    
    .emoji-grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 4px;
      padding: 12px;
      max-height: 150px;
      overflow-y: auto;
    }
    
    .emoji-item {
      width: 28px;
      height: 28px;
      border: none;
      background: none;
      cursor: pointer;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: background-color 0.2s;
    }
    
    .emoji-item:hover {
      background: #f0f0f0;
    }
    
    .emoji-picker-footer {
      padding: 8px 12px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      .composer-container {
        padding: 12px;
      }
      
      .composer-main {
        gap: 8px;
      }
      
      .send-button {
        width: 40px;
        height: 40px;
      }
      
      .emoji-picker {
        right: 48px;
        width: 240px;
      }
      
      .emoji-grid {
        grid-template-columns: repeat(6, 1fr);
      }
    }
    
    @media (max-width: 480px) {
      .attachment-button {
        display: none;
      }
      
      .emoji-picker {
        right: 8px;
        left: 8px;
        width: auto;
      }
    }
  `]
})
export class ComposerComponent implements OnInit, OnDestroy {
  @Input() conversation: Conversation | null = null;
  @Input() replyingTo: Message | null = null;
  @Output() messageSent = new EventEmitter<Message>();
  @Output() replyCancel = new EventEmitter<void>();
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  messageText = '';
  sending = false;
  showEmojiPicker = false;
  uploadProgress = 0;
  fileAccept = '*/*';
  showTypingIndicator = false;
  typingUsers: string[] = [];
  
  commonEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
    '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
    '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
    '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
    '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
    '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
    '👍', '👎', '👌', '🤞', '✌️', '🤟', '🤘', '👏',
    '🙌', '👐', '🤲', '🤝', '🙏', '❤️', '🧡', '💛'
  ];
  
  private destroy$ = new Subject<void>();
  private typingTimeout: any;
  private isTyping = false;

  constructor(
    private chatApiService: ChatApiService,
    private typingService: TypingService
  ) {}

  ngOnInit(): void {
    // Subscribe to typing events from other users
    if (this.conversation) {
      this.typingService.getTypingUsersForConversation(this.conversation.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe((typingEvents: any[]) => {
        // Extract user names from typing events
        this.typingUsers = typingEvents.map((event: any) => event.user.name);
        this.showTypingIndicator = this.typingUsers.length > 0;
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearTypingTimeout();
  }

  onKeyDown(event: KeyboardEvent): void {
    // Enhanced keyboard shortcuts
    if (event.key === 'Enter') {
      if (event.shiftKey || event.ctrlKey) {
        // Allow new line with Shift+Enter or Ctrl+Enter
        return;
      } else {
        // Send message with Enter
        event.preventDefault();
        this.sendMessage();
      }
    } else if (event.key === 'Escape') {
      // Clear message or close emoji picker with Escape
      if (this.showEmojiPicker) {
        this.showEmojiPicker = false;
      } else if (this.messageText.trim()) {
        this.messageText = '';
        this.adjustTextareaHeight();
      }
    } else if (event.ctrlKey && event.key === 'k') {
      // Toggle emoji picker with Ctrl+K
      event.preventDefault();
      this.toggleEmojiPicker();
    } else if (event.ctrlKey && event.key === 'u') {
      // Upload file with Ctrl+U
      event.preventDefault();
      this.selectFile('any');
    }
  }

  onInput(): void {
    this.adjustTextareaHeight();
    this.handleTyping();
  }

  onFocus(): void {
    this.showEmojiPicker = false;
  }

  onBlur(): void {
    this.stopTyping();
  }

  private adjustTextareaHeight(): void {
    if (this.messageInput) {
      const textarea = this.messageInput.nativeElement;
      const minHeight = 20;
      const maxHeight = 120;
      
      // Reset height to calculate scroll height
      textarea.style.height = 'auto';
      
      // Calculate new height based on content
      const scrollHeight = textarea.scrollHeight;
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      
      // Apply smooth transition
      textarea.style.height = newHeight + 'px';
      
      // Show/hide scrollbar based on content
      if (scrollHeight > maxHeight) {
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.overflowY = 'hidden';
      }
    }
  }

  private handleTyping(): void {
    if (!this.conversation) return;

    const hasContent = this.messageText.trim().length > 0;
    
    if (hasContent && !this.isTyping) {
      // Start typing indicator
      this.isTyping = true;
      this.typingService.startTyping(this.conversation.id);
    } else if (!hasContent && this.isTyping) {
      // Stop typing immediately if no content
      this.stopTyping();
      return;
    }

    // Reset timeout for continuous typing
    this.clearTypingTimeout();
    
    if (this.isTyping) {
      this.typingTimeout = setTimeout(() => {
        this.stopTyping();
      }, 2000); // Reduced timeout for better responsiveness
    }
  }

  private stopTyping(): void {
    if (this.isTyping && this.conversation) {
      this.isTyping = false;
      this.typingService.stopTyping(this.conversation.id);
    }
    this.clearTypingTimeout();
  }

  private clearTypingTimeout(): void {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }

  canSend(): boolean {
    return this.messageText.trim().length > 0 && !this.sending;
  }

  sendMessage(): void {
    if (!this.canSend() || !this.conversation) {
      return;
    }

    const messageData: SendMessageRequest = {
      conversation_id: this.conversation.id,
      body: this.messageText.trim(),
      type: 'text' as const
    };

    this.sending = true;
    this.stopTyping();

    this.chatApiService.sendMessage(messageData).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (message) => {
        this.messageSent.emit(message);
        this.messageText = '';
        this.sending = false;
        this.cancelReply();
        this.adjustTextareaHeight();
        
        // Focus back to input
        setTimeout(() => {
          if (this.messageInput) {
            this.messageInput.nativeElement.focus();
          }
        });
      },
      error: (error: any) => {
        console.error('Error sending message:', error);
        this.sending = false;
      }
    });
  }

  selectFile(type: 'image' | 'document' | 'any'): void {
    switch (type) {
      case 'image':
        this.fileAccept = 'image/*';
        break;
      case 'document':
        this.fileAccept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';
        break;
      default:
        this.fileAccept = '*/*';
    }
    
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        this.uploadFile(files[i]);
      }
    }
    
    // Reset input
    input.value = '';
  }

  private uploadFile(file: File): void {
    if (!this.conversation) return;

    this.uploadProgress = 0;
    
    const messageData: SendMessageRequest = {
       conversation_id: this.conversation.id,
       body: file.name,
       type: 'file' as const,
       file: file
     };
    
    this.chatApiService.sendMessage(messageData).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (message: Message) => {
        this.uploadProgress = 0;
        this.messageSent.emit(message);
      },
      error: (error: any) => {
        console.error('Error uploading file:', error);
        this.uploadProgress = 0;
      }
    });
  }

  cancelUpload(): void {
    // Implement upload cancellation logic
    this.uploadProgress = 0;
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  insertEmoji(emoji: string): void {
    const textarea = this.messageInput.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const textBefore = this.messageText.substring(0, start);
    const textAfter = this.messageText.substring(end);
    
    this.messageText = textBefore + emoji + textAfter;
    
    // Set cursor position after emoji
    setTimeout(() => {
      const newPosition = start + emoji.length;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    });
    
    this.adjustTextareaHeight();
  }

  cancelReply(): void {
    this.replyCancel.emit();
  }

  getReplyPreview(message: Message): string {
    if (message.type === 'file') {
      return `📎 ${message.file_name || 'Arquivo'}`;
    }
    return message.body || 'Mensagem';
  }

  getTypingText(): string {
    if (this.typingUsers.length === 0) return '';
    
    if (this.typingUsers.length === 1) {
      return `${this.typingUsers[0]} está digitando...`;
    } else if (this.typingUsers.length === 2) {
      return `${this.typingUsers[0]} e ${this.typingUsers[1]} estão digitando...`;
    } else {
      return `${this.typingUsers.length} pessoas estão digitando...`;
    }
  }
}