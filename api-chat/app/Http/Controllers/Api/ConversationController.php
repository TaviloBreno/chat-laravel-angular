<?php

namespace App\Http\Controllers\Api;

use App\Events\UserTyping;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreConversationRequest;
use App\Http\Requests\UpdateConversationRequest;
use App\Http\Requests\ManageParticipantsRequest;
use App\Http\Resources\ConversationResource;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ConversationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $user = Auth::user();
        
        $conversations = $user->conversations()
            ->with(['users', 'owner', 'lastMessage'])
            ->get();

        return ConversationResource::collection($conversations);
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
    public function store(StoreConversationRequest $request)
    {

        $user = Auth::user();
        
        // Para conversas privadas, verificar se já existe uma conversa entre os usuários
        if ($request->type === 'private' && count($request->user_ids) === 1) {
            $otherUserId = $request->user_ids[0];
            $existingConversation = $user->conversations()
                ->where('type', 'private')
                ->whereHas('users', function ($query) use ($otherUserId) {
                    $query->where('user_id', $otherUserId);
                })
                ->first();

            if ($existingConversation) {
                return new ConversationResource($existingConversation->load(['users', 'owner']));
            }
        }

        $conversation = Conversation::create([
            'type' => $request->type,
            'title' => $request->title,
            'owner_id' => $user->id,
        ]);

        // Adicionar o criador da conversa
        $conversation->users()->attach($user->id, ['role' => 'admin']);
        
        // Adicionar outros usuários
        foreach ($request->user_ids as $userId) {
            if ($userId !== $user->id) {
                $conversation->users()->attach($userId, ['role' => 'member']);
            }
        }

        return new ConversationResource($conversation->load(['users', 'owner']));
    }

    /**
     * Display the specified resource.
     */
    public function show(Conversation $conversation)
    {
        $user = Auth::user();
        
        // Verificar se o usuário faz parte da conversa
        if (!$conversation->users()->where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $conversation->load(['users', 'owner', 'lastMessage']);
        
        return new ConversationResource($conversation);
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
    public function update(UpdateConversationRequest $request, Conversation $conversation)
    {
        $conversation->update($request->only(['title']));
        
        return new ConversationResource($conversation->load(['users', 'owner']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Conversation $conversation)
    {
        $user = Auth::user();
        
        // Apenas o owner pode deletar a conversa
        if ($conversation->owner_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $conversation->delete();
        
        return response()->json(['message' => 'Conversation deleted successfully']);
    }

    /**
     * Add user to conversation
     */
    public function addUser(ManageParticipantsRequest $request, Conversation $conversation)
    {
        $role = $request->role ?? 'member';
        
        if (!$conversation->users()->where('user_id', $request->user_id)->exists()) {
            $conversation->users()->attach($request->user_id, ['role' => $role]);
        }
        
        return new ConversationResource($conversation->load(['users', 'owner']));
    }

    /**
     * Remove user from conversation
     */
    public function removeUser(ManageParticipantsRequest $request, Conversation $conversation)
    {
        // Não permitir remover o owner
        if ($request->user_id == $conversation->owner_id) {
            return response()->json(['message' => 'Cannot remove conversation owner'], 400);
        }
        
        $conversation->users()->detach($request->user_id);
        
        return new ConversationResource($conversation->load(['users', 'owner']));
    }

    /**
     * Send typing indicator
     */
    public function typing(Request $request, Conversation $conversation)
    {
        $user = Auth::user();
        
        // Verificar se o usuário faz parte da conversa
        if (!$conversation->users()->where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $isTyping = $request->boolean('is_typing', true);
        
        // Disparar evento de broadcasting
        broadcast(new UserTyping($user, $conversation, $isTyping));
        
        return response()->json(['message' => 'Typing indicator sent']);
    }
}
