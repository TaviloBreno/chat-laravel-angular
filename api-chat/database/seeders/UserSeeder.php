<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Criar usuários de teste
        $users = [
            [
                'name' => 'João Silva',
                'email' => 'joao@example.com',
                'password' => Hash::make('password'),
                'avatar_url' => 'https://ui-avatars.com/api/?name=João+Silva&background=0d8abc&color=fff',
                'status_online' => true,
                'last_seen_at' => now(),
            ],
            [
                'name' => 'Maria Santos',
                'email' => 'maria@example.com',
                'password' => Hash::make('password'),
                'avatar_url' => 'https://ui-avatars.com/api/?name=Maria+Santos&background=f56565&color=fff',
                'status_online' => false,
                'last_seen_at' => now()->subMinutes(30),
            ],
            [
                'name' => 'Pedro Costa',
                'email' => 'pedro@example.com',
                'password' => Hash::make('password'),
                'avatar_url' => 'https://ui-avatars.com/api/?name=Pedro+Costa&background=38a169&color=fff',
                'status_online' => true,
                'last_seen_at' => now(),
            ],
            [
                'name' => 'Ana Oliveira',
                'email' => 'ana@example.com',
                'password' => Hash::make('password'),
                'avatar_url' => 'https://ui-avatars.com/api/?name=Ana+Oliveira&background=9f7aea&color=fff',
                'status_online' => false,
                'last_seen_at' => now()->subHours(2),
            ],
            [
                'name' => 'Carlos Ferreira',
                'email' => 'carlos@example.com',
                'password' => Hash::make('password'),
                'avatar_url' => 'https://ui-avatars.com/api/?name=Carlos+Ferreira&background=ed8936&color=fff',
                'status_online' => true,
                'last_seen_at' => now(),
            ],
        ];

        foreach ($users as $userData) {
            User::create($userData);
        }
    }
}
