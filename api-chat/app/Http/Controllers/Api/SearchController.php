<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SearchRequest;
use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class SearchController extends Controller
{
    /**
     * Search messages and users
     */
    public function search(SearchRequest $request)
    {

        $query = $request->input('query');
        $type = $request->input('type', 'all');
        $conversationId = $request->input('conversation_id');
        $user = Auth::user();
        
        $results = [];
        
        // Search messages
        if ($type === 'messages' || $type === 'all') {
            $messagesQuery = Message::query()
                ->with(['user', 'conversation'])
                ->where('body', 'like', "%{$query}%")
                ->whereHas('conversation.users', function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                });
                
            if ($conversationId) {
                $messagesQuery->where('conversation_id', $conversationId);
            }
            
            $messages = $messagesQuery
                ->orderBy('created_at', 'desc')
                ->limit(20)
                ->get();
                
            $results['messages'] = $messages;
        }
        
        // Search users (only if not searching within a specific conversation)
        if (($type === 'users' || $type === 'all') && !$conversationId) {
            $users = User::query()
                ->where('id', '!=', $user->id)
                ->where(function ($q) use ($query) {
                    $q->where('name', 'like', "%{$query}%")
                      ->orWhere('email', 'like', "%{$query}%");
                })
                ->orderBy('name')
                ->limit(10)
                ->get(['id', 'name', 'email', 'avatar_url', 'status_online', 'last_seen_at']);
                
            $results['users'] = $users;
        }
        
        return response()->json([
            'query' => $query,
            'results' => $results,
            'total' => [
                'messages' => isset($results['messages']) ? count($results['messages']) : 0,
                'users' => isset($results['users']) ? count($results['users']) : 0,
            ]
        ]);
    }
}
