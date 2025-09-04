<?php

namespace App\Jobs;

use App\Models\Message;
use App\Models\Conversation;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ProcessMessagePersistence implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $message;
    public $action;

    /**
     * Create a new job instance.
     */
    public function __construct(Message $message, string $action = 'create')
    {
        $this->message = $message;
        $this->action = $action; // 'create', 'update', 'delete'
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            switch ($this->action) {
                case 'create':
                    $this->handleMessageCreation();
                    break;
                case 'update':
                    $this->handleMessageUpdate();
                    break;
                case 'delete':
                    $this->handleMessageDeletion();
                    break;
            }
        } catch (\Exception $e) {
            Log::error('Erro ao processar persistência de mensagem', [
                'message_id' => $this->message->id,
                'action' => $this->action,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    private function handleMessageCreation(): void
    {
        // Atualizar estatísticas da conversa
        $conversation = $this->message->conversation;
        $conversation->increment('messages_count');
        $conversation->touch(); // Atualiza updated_at

        // Processar anexos se existirem
        if ($this->message->attachments) {
            $this->processAttachments();
        }

        // Indexar mensagem para busca (se necessário)
        $this->indexMessageForSearch();

        Log::info('Mensagem criada e processada', [
            'message_id' => $this->message->id,
            'conversation_id' => $this->message->conversation_id
        ]);
    }

    private function handleMessageUpdate(): void
    {
        // Marcar como editada
        $this->message->update(['edited_at' => now()]);

        // Reindexar para busca
        $this->indexMessageForSearch();

        Log::info('Mensagem atualizada', [
            'message_id' => $this->message->id
        ]);
    }

    private function handleMessageDeletion(): void
    {
        // Decrementar contador da conversa
        $conversation = $this->message->conversation;
        $conversation->decrement('messages_count');

        // Remover anexos do storage
        if ($this->message->attachments) {
            $this->removeAttachments();
        }

        // Remover do índice de busca
        $this->removeFromSearchIndex();

        Log::info('Mensagem deletada e processada', [
            'message_id' => $this->message->id
        ]);
    }

    private function processAttachments(): void
    {
        // Processar anexos (thumbnails, compressão, etc.)
        foreach ($this->message->attachments as $attachment) {
            // Gerar thumbnails para imagens
            if (str_starts_with($attachment->mime_type, 'image/')) {
                $this->generateThumbnail($attachment);
            }
        }
    }

    private function removeAttachments(): void
    {
        foreach ($this->message->attachments as $attachment) {
            Storage::delete($attachment->file_path);
            if ($attachment->thumbnail_path) {
                Storage::delete($attachment->thumbnail_path);
            }
        }
    }

    private function generateThumbnail($attachment): void
    {
        // Implementar geração de thumbnail
        // Pode usar bibliotecas como Intervention Image
    }

    private function indexMessageForSearch(): void
    {
        // Implementar indexação para busca full-text
        // Pode usar Elasticsearch, Algolia, etc.
    }

    private function removeFromSearchIndex(): void
    {
        // Remover da indexação de busca
    }
}
