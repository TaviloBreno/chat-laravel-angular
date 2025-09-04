<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMessageRequest;
use App\Http\Requests\UpdateMessageRequest;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessageRead;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MessageController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request, Conversation $conversation)
    {
        $user = Auth::user();
        
        // Verificar se o usuário faz parte da conversa
        if (!$conversation->users()->where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $messages = $conversation->messages()
            ->with(['user', 'reads'])
            ->orderBy('created_at', 'asc')
            ->paginate(50);

        return response()->json($messages);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreMessageRequest $request, Conversation $conversation)
    {
        $user = Auth::user();
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'body' => 'required|string',
            'type' => 'sometimes|string|in:text,image,file',
            'meta' => 'sometimes|array',
        ]);

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'user_id' => $user->id,
            'body' => $request->body,
            'type' => $request->type ?? 'text',
            'meta' => $request->meta,
        ]);

        // Marcar como lida pelo remetente
        MessageRead::create([
            'message_id' => $message->id,
            'user_id' => $user->id,
            'read_at' => now(),
        ]);

        return response()->json($message->load(['user', 'reads']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Message $message)
    {
        $user = Auth::user();
        
        // Verificar se o usuário faz parte da conversa
        if (!$message->conversation->users()->where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($message->load(['user', 'reads', 'conversation']));
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Message $message)
    {
        $user = Auth::user();
        
        // Apenas o autor da mensagem pode editá-la
        if ($message->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'body' => 'sometimes|string',
            'meta' => 'sometimes|array',
        ]);

        $message->update($request->only(['body', 'meta']));
        
        return response()->json($message->load(['user', 'reads']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Message $message)
    {
        $user = Auth::user();
        
        // Apenas o autor da mensagem pode deletá-la
        if ($message->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $message->delete();
        
        return response()->json(['message' => 'Message deleted successfully']);
    }

    /**
     * Mark message as read
     */
    public function markAsRead(Request $request, Message $message)
    {
        $user = Auth::user();
        
        // Verificar se o usuário faz parte da conversa
        if (!$message->conversation->users()->where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Verificar se já foi marcada como lida
        $existingRead = MessageRead::where('message_id', $message->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$existingRead) {
            MessageRead::create([
                'message_id' => $message->id,
                'user_id' => $user->id,
                'read_at' => now(),
            ]);
        }

        return response()->json(['message' => 'Message marked as read']);
    }

    /**
     * Mark all messages in conversation as read
     */
    public function markAllAsRead(Request $request, Conversation $conversation)
    {
        $user = Auth::user();
        
        // Verificar se o usuário faz parte da conversa
        if (!$conversation->users()->where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $unreadMessages = $conversation->messages()
            ->whereDoesntHave('reads', function ($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->get();

        foreach ($unreadMessages as $message) {
            MessageRead::create([
                'message_id' => $message->id,
                'user_id' => $user->id,
                'read_at' => now(),
            ]);
        }

        return response()->json(['message' => 'All messages marked as read']);
    }
}
