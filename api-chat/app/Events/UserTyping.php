<?php

namespace App\Events;

use App\Models\User;
use App\Models\Conversation;
use App\Http\Resources\UserResource;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserTyping implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $user;
    public $conversation;
    public $isTyping;

    /**
     * Create a new event instance.
     */
    public function __construct(User $user, Conversation $conversation, bool $isTyping = true)
    {
        $this->user = $user;
        $this->conversation = $conversation;
        $this->isTyping = $isTyping;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('private-conversation.' . $this->conversation->id),
        ];
    }

    /**
     * Get the data to broadcast.
     *
     * @return array
     */
    public function broadcastWith(): array
    {
        return [
            'user' => new UserResource($this->user),
            'conversation_id' => $this->conversation->id,
            'is_typing' => $this->isTyping,
        ];
    }

    /**
     * The event's broadcast name.
     *
     * @return string
     */
    public function broadcastAs(): string
    {
        return 'user.typing';
    }
}
