<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MessageResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'conversation_id' => $this->conversation_id,
            'user_id' => $this->user_id,
            'body' => $this->body,
            'type' => $this->type,
            'meta' => $this->meta,
            'user' => new UserResource($this->whenLoaded('user')),
            'conversation' => new ConversationResource($this->whenLoaded('conversation')),
            'is_read' => $this->when(isset($this->is_read), $this->is_read),
            'read_at' => $this->when(isset($this->read_at), $this->read_at?->toISOString()),
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
