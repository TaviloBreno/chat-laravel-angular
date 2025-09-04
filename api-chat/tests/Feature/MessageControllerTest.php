<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class MessageControllerTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    public function test_user_can_get_conversation_messages(): void
    {
        $user = User::factory()->create();
        $conversation = Conversation::factory()->create(['owner_id' => $user->id]);
        $conversation->users()->attach($user->id, ['role' => 'admin']);
        
        Message::factory()->count(3)->create([
            'conversation_id' => $conversation->id,
            'user_id' => $user->id
        ]);

        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token
        ])->getJson("/api/conversations/{$conversation->id}/messages");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id', 'body', 'type', 'user', 'created_at'
                    ]
                ]
            ]);
    }

    public function test_user_can_send_message(): void
    {
        Bus::fake();
        Event::fake();
        
        $user = User::factory()->create();
        $conversation = Conversation::factory()->create(['owner_id' => $user->id]);
        $conversation->users()->attach($user->id, ['role' => 'admin']);

        $messageData = [
            'body' => $this->faker->sentence,
            'type' => 'text'
        ];

        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token
        ])->postJson("/api/conversations/{$conversation->id}/messages", $messageData);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'id', 'body', 'type', 'user', 'created_at'
                ]
            ]);

        $this->assertDatabaseHas('messages', [
            'conversation_id' => $conversation->id,
            'user_id' => $user->id,
            'body' => $messageData['body']
        ]);
    }

    public function test_user_cannot_access_messages_from_conversation_they_are_not_part_of(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $conversation = Conversation::factory()->create(['owner_id' => $otherUser->id]);
        $conversation->users()->attach($otherUser->id);

        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token
        ])->getJson("/api/conversations/{$conversation->id}/messages");

        $response->assertStatus(403);
    }

    public function test_user_can_update_their_own_message(): void
    {
        $user = User::factory()->create();
        $conversation = Conversation::factory()->create(['owner_id' => $user->id]);
        $conversation->users()->attach($user->id, ['role' => 'admin']);
        
        $message = Message::factory()->create([
            'conversation_id' => $conversation->id,
            'user_id' => $user->id
        ]);

        $updateData = [
            'body' => 'Updated message content'
        ];

        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token
        ])->patchJson("/api/messages/{$message->id}", $updateData);

        $response->assertStatus(200)
            ->assertJsonFragment([
                'body' => 'Updated message content'
            ]);

        $this->assertDatabaseHas('messages', [
            'id' => $message->id,
            'body' => 'Updated message content'
        ]);
    }

    public function test_user_can_delete_their_own_message(): void
    {
        $user = User::factory()->create();
        $conversation = Conversation::factory()->create(['owner_id' => $user->id]);
        $conversation->users()->attach($user->id, ['role' => 'admin']);
        
        $message = Message::factory()->create([
            'conversation_id' => $conversation->id,
            'user_id' => $user->id
        ]);

        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token
        ])->deleteJson("/api/messages/{$message->id}");

        $response->assertStatus(204);

        $this->assertSoftDeleted('messages', [
            'id' => $message->id
        ]);
    }
}
