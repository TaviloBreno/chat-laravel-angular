<?php

namespace App\Console\Commands;

use App\Events\MessageSent;
use App\Events\TypingStarted;
use App\Events\ConversationCreated;
use App\Models\User;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Log;

class TestBroadcasting extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:broadcasting {--event=all : Evento específico para testar}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Testa a configuração de broadcasting e eventos em tempo real';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🚀 Iniciando testes de Broadcasting...');
        
        $event = $this->option('event');
        
        try {
            // Testar configuração do Pusher
            $this->testPusherConnection();
            
            // Testar canais
            $this->testChannelAuthentication();
            
            // Testar eventos específicos ou todos
            switch ($event) {
                case 'message':
                    $this->testMessageEvents();
                    break;
                case 'typing':
                    $this->testTypingEvents();
                    break;
                case 'conversation':
                    $this->testConversationEvents();
                    break;
                case 'all':
                default:
                    $this->testAllEvents();
                    break;
            }
            
            $this->info('✅ Todos os testes de broadcasting foram concluídos!');
            
        } catch (\Exception $e) {
            $this->error('❌ Erro durante os testes: ' . $e->getMessage());
            Log::error('Erro no teste de broadcasting', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return 1;
        }
        
        return 0;
    }
    
    private function testPusherConnection(): void
    {
        $this->info('🔗 Testando conexão com Pusher...');
        
        $config = config('broadcasting.connections.pusher');
        
        if (empty($config['key']) || empty($config['secret']) || empty($config['app_id'])) {
            throw new \Exception('Configurações do Pusher não encontradas no .env');
        }
        
        $this->line('   ✓ Configurações do Pusher encontradas');
        $this->line('   ✓ App ID: ' . $config['app_id']);
        $this->line('   ✓ Cluster: ' . ($config['options']['cluster'] ?? 'default'));
    }
    
    private function testChannelAuthentication(): void
    {
        $this->info('🔐 Testando autenticação de canais...');
        
        // Verificar se o arquivo channels.php existe
        $channelsFile = base_path('routes/channels.php');
        if (!file_exists($channelsFile)) {
            throw new \Exception('Arquivo routes/channels.php não encontrado');
        }
        
        $this->line('   ✓ Arquivo de canais encontrado');
        
        // Verificar se BroadcastServiceProvider está registrado
        $providers = config('app.providers', []);
        $broadcastProvider = collect($providers)->contains(function ($provider) {
            return str_contains($provider, 'BroadcastServiceProvider');
        });
        
        if (!$broadcastProvider) {
            $this->warn('   ⚠ BroadcastServiceProvider pode não estar registrado');
        } else {
            $this->line('   ✓ BroadcastServiceProvider registrado');
        }
    }
    
    private function testAllEvents(): void
    {
        $this->testMessageEvents();
        $this->testTypingEvents();
        $this->testConversationEvents();
    }
    
    private function testMessageEvents(): void
    {
        $this->info('💬 Testando eventos de mensagem...');
        
        // Criar dados de teste
        $user = $this->createTestUser();
        $conversation = $this->createTestConversation($user);
        $message = $this->createTestMessage($user, $conversation);
        
        try {
            // Testar MessageSent
            $this->line('   Testando MessageSent...');
            broadcast(new MessageSent($message));
            $this->line('   ✓ MessageSent disparado com sucesso');
            
        } catch (\Exception $e) {
            $this->error('   ❌ Erro ao testar MessageSent: ' . $e->getMessage());
        }
    }
    
    private function testTypingEvents(): void
    {
        $this->info('⌨️ Testando eventos de digitação...');
        
        $user = $this->createTestUser();
        $conversationId = 1;
        
        try {
            $this->line('   Testando TypingStarted...');
            broadcast(new TypingStarted($user, $conversationId));
            $this->line('   ✓ TypingStarted disparado com sucesso');
            
        } catch (\Exception $e) {
            $this->error('   ❌ Erro ao testar TypingStarted: ' . $e->getMessage());
        }
    }
    
    private function testConversationEvents(): void
    {
        $this->info('💭 Testando eventos de conversa...');
        
        $user = $this->createTestUser();
        $conversation = $this->createTestConversation($user);
        
        try {
            $this->line('   Testando ConversationCreated...');
            broadcast(new ConversationCreated($conversation));
            $this->line('   ✓ ConversationCreated disparado com sucesso');
            
        } catch (\Exception $e) {
            $this->error('   ❌ Erro ao testar ConversationCreated: ' . $e->getMessage());
        }
    }
    
    private function createTestUser(): User
    {
        return new User([
            'id' => 999,
            'name' => 'Test User',
            'email' => 'test@example.com',
            'avatar_url' => null
        ]);
    }
    
    private function createTestConversation(User $user): Conversation
    {
        $conversation = new Conversation([
            'id' => 999,
            'type' => 'private',
            'title' => 'Test Conversation',
            'owner_id' => $user->id,
            'created_at' => now(),
            'updated_at' => now()
        ]);
        
        // Simular relacionamento
        $conversation->setRelation('owner', $user);
        $conversation->setRelation('users', collect([$user]));
        
        return $conversation;
    }
    
    private function createTestMessage(User $user, Conversation $conversation): Message
    {
        $message = new Message([
            'id' => 999,
            'conversation_id' => $conversation->id,
            'user_id' => $user->id,
            'content' => 'Test message for broadcasting',
            'type' => 'text',
            'created_at' => now(),
            'updated_at' => now()
        ]);
        
        // Simular relacionamentos
        $message->setRelation('user', $user);
        $message->setRelation('conversation', $conversation);
        
        return $message;
    }
}
