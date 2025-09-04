<?php

namespace App\Jobs;

use App\Models\Message;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessMessageNotification implements ShouldQueue
{
    use Queueable, InteractsWithQueue, SerializesModels;

    public $message;
    public $tries = 3;
    public $timeout = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(Message $message)
    {
        $this->message = $message;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            // Buscar usuários da conversa que não são o remetente
            $recipients = $this->message->conversation->users()
                ->where('user_id', '!=', $this->message->user_id)
                ->get();

            foreach ($recipients as $recipient) {
                // Aqui você pode implementar diferentes tipos de notificação:
                // - Push notifications
                // - Email notifications
                // - SMS notifications
                // - In-app notifications
                
                $this->sendPushNotification($recipient, $this->message);
                $this->createInAppNotification($recipient, $this->message);
            }

            Log::info('Message notification processed successfully', [
                'message_id' => $this->message->id,
                'conversation_id' => $this->message->conversation_id,
                'recipients_count' => $recipients->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to process message notification', [
                'message_id' => $this->message->id,
                'error' => $e->getMessage()
            ]);
            
            throw $e;
        }
    }

    /**
     * Send push notification to user
     */
    private function sendPushNotification(User $user, Message $message): void
    {
        // Implementar integração com serviços de push notification
        // Ex: Firebase Cloud Messaging, Pusher Beams, etc.
        Log::info('Push notification sent', [
            'user_id' => $user->id,
            'message_id' => $message->id
        ]);
    }

    /**
     * Create in-app notification
     */
    private function createInAppNotification(User $user, Message $message): void
    {
        // Criar notificação no banco de dados para exibir na aplicação
        // Você pode criar uma tabela de notifications para isso
        Log::info('In-app notification created', [
            'user_id' => $user->id,
            'message_id' => $message->id
        ]);
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('ProcessMessageNotification job failed', [
            'message_id' => $this->message->id,
            'error' => $exception->getMessage()
        ]);
    }
}
