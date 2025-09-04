<?php

namespace Database\Seeders;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessageRead;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ConversationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::all();
        
        if ($users->count() < 2) {
            return;
        }

        // Criar conversa privada entre João e Maria
        $privateConversation = Conversation::create([
            'type' => 'private',
            'title' => null,
            'owner_id' => $users[0]->id, // João
        ]);

        $privateConversation->users()->attach([
            $users[0]->id => ['role' => 'admin'],
            $users[1]->id => ['role' => 'member'],
        ]);

        // Mensagens da conversa privada
        $privateMessages = [
            ['user_id' => $users[0]->id, 'body' => 'Oi Maria! Como você está?', 'created_at' => now()->subHours(2)],
            ['user_id' => $users[1]->id, 'body' => 'Oi João! Estou bem, obrigada. E você?', 'created_at' => now()->subHours(2)->addMinutes(5)],
            ['user_id' => $users[0]->id, 'body' => 'Também estou bem! Vamos nos encontrar hoje?', 'created_at' => now()->subHours(1)->addMinutes(30)],
            ['user_id' => $users[1]->id, 'body' => 'Claro! Que horas?', 'created_at' => now()->subHours(1)->addMinutes(35)],
            ['user_id' => $users[0]->id, 'body' => 'Que tal às 15h no café da esquina?', 'created_at' => now()->subMinutes(30)],
        ];

        foreach ($privateMessages as $messageData) {
            $message = Message::create([
                'conversation_id' => $privateConversation->id,
                'user_id' => $messageData['user_id'],
                'body' => $messageData['body'],
                'type' => 'text',
                'created_at' => $messageData['created_at'],
                'updated_at' => $messageData['created_at'],
            ]);

            // Marcar como lida pelo remetente
            MessageRead::create([
                'message_id' => $message->id,
                'user_id' => $messageData['user_id'],
                'read_at' => $messageData['created_at'],
            ]);
        }

        // Criar conversa em grupo
        $groupConversation = Conversation::create([
            'type' => 'group',
            'title' => 'Equipe de Desenvolvimento',
            'owner_id' => $users[0]->id, // João
        ]);

        // Adicionar usuários ao grupo
        $groupConversation->users()->attach([
            $users[0]->id => ['role' => 'admin'],
            $users[1]->id => ['role' => 'member'],
            $users[2]->id => ['role' => 'member'],
            $users[3]->id => ['role' => 'member'],
        ]);

        // Mensagens do grupo
        $groupMessages = [
            ['user_id' => $users[0]->id, 'body' => 'Pessoal, vamos discutir o novo projeto!', 'created_at' => now()->subHours(3)],
            ['user_id' => $users[2]->id, 'body' => 'Ótima ideia! Qual é o escopo?', 'created_at' => now()->subHours(3)->addMinutes(10)],
            ['user_id' => $users[1]->id, 'body' => 'Estou animada para começar!', 'created_at' => now()->subHours(2)->addMinutes(45)],
            ['user_id' => $users[3]->id, 'body' => 'Quando é o prazo de entrega?', 'created_at' => now()->subHours(2)->addMinutes(50)],
            ['user_id' => $users[0]->id, 'body' => 'Temos 2 semanas. Vou enviar os detalhes por email.', 'created_at' => now()->subHours(1)],
            ['user_id' => $users[2]->id, 'body' => 'Perfeito! Já estou organizando as tarefas.', 'created_at' => now()->subMinutes(45)],
        ];

        foreach ($groupMessages as $messageData) {
            $message = Message::create([
                'conversation_id' => $groupConversation->id,
                'user_id' => $messageData['user_id'],
                'body' => $messageData['body'],
                'type' => 'text',
                'created_at' => $messageData['created_at'],
                'updated_at' => $messageData['created_at'],
            ]);

            // Marcar como lida pelo remetente
            MessageRead::create([
                'message_id' => $message->id,
                'user_id' => $messageData['user_id'],
                'read_at' => $messageData['created_at'],
            ]);
        }

        // Criar outra conversa privada entre Pedro e Ana
        $privateConversation2 = Conversation::create([
            'type' => 'private',
            'title' => null,
            'owner_id' => $users[2]->id, // Pedro
        ]);

        $privateConversation2->users()->attach([
            $users[2]->id => ['role' => 'admin'],
            $users[3]->id => ['role' => 'member'],
        ]);

        // Mensagens da segunda conversa privada
        $privateMessages2 = [
            ['user_id' => $users[2]->id, 'body' => 'Ana, você viu o novo design?', 'created_at' => now()->subMinutes(20)],
            ['user_id' => $users[3]->id, 'body' => 'Sim! Ficou incrível. Parabéns!', 'created_at' => now()->subMinutes(15)],
            ['user_id' => $users[2]->id, 'body' => 'Obrigado! Trabalhei bastante nele.', 'created_at' => now()->subMinutes(10)],
        ];

        foreach ($privateMessages2 as $messageData) {
            $message = Message::create([
                'conversation_id' => $privateConversation2->id,
                'user_id' => $messageData['user_id'],
                'body' => $messageData['body'],
                'type' => 'text',
                'created_at' => $messageData['created_at'],
                'updated_at' => $messageData['created_at'],
            ]);

            // Marcar como lida pelo remetente
            MessageRead::create([
                'message_id' => $message->id,
                'user_id' => $messageData['user_id'],
                'read_at' => $messageData['created_at'],
            ]);
        }
    }
}
