<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\UploadedFile;

class ProcessFileUpload implements ShouldQueue
{
    use Queueable, InteractsWithQueue, SerializesModels;

    public $filePath;
    public $originalName;
    public $mimeType;
    public $userId;
    public $tries = 3;
    public $timeout = 300; // 5 minutos para uploads grandes

    /**
     * Create a new job instance.
     */
    public function __construct(string $filePath, string $originalName, string $mimeType, int $userId)
    {
        $this->filePath = $filePath;
        $this->originalName = $originalName;
        $this->mimeType = $mimeType;
        $this->userId = $userId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            // Verificar se o arquivo existe
            if (!Storage::exists($this->filePath)) {
                throw new \Exception('File not found: ' . $this->filePath);
            }

            // Processar diferentes tipos de arquivo
            if (str_starts_with($this->mimeType, 'image/')) {
                $this->processImage();
            } elseif (str_starts_with($this->mimeType, 'video/')) {
                $this->processVideo();
            } elseif (str_starts_with($this->mimeType, 'audio/')) {
                $this->processAudio();
            } else {
                $this->processDocument();
            }

            Log::info('File upload processed successfully', [
                'file_path' => $this->filePath,
                'original_name' => $this->originalName,
                'mime_type' => $this->mimeType,
                'user_id' => $this->userId
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to process file upload', [
                'file_path' => $this->filePath,
                'error' => $e->getMessage()
            ]);
            
            throw $e;
        }
    }

    /**
     * Process image files
     */
    private function processImage(): void
    {
        // Gerar thumbnails para imagens
        // Otimizar qualidade da imagem
        // Extrair metadados (dimensões, etc.)
        Log::info('Processing image file', ['file_path' => $this->filePath]);
        
        // Aqui você pode usar bibliotecas como Intervention Image
        // para redimensionar, criar thumbnails, etc.
    }

    /**
     * Process video files
     */
    private function processVideo(): void
    {
        // Gerar thumbnails do vídeo
        // Converter para formatos otimizados
        // Extrair metadados (duração, resolução, etc.)
        Log::info('Processing video file', ['file_path' => $this->filePath]);
        
        // Aqui você pode usar FFmpeg para processamento de vídeo
    }

    /**
     * Process audio files
     */
    private function processAudio(): void
    {
        // Converter para formatos otimizados
        // Extrair metadados (duração, bitrate, etc.)
        Log::info('Processing audio file', ['file_path' => $this->filePath]);
        
        // Aqui você pode usar FFmpeg para processamento de áudio
    }

    /**
     * Process document files
     */
    private function processDocument(): void
    {
        // Gerar preview/thumbnail para documentos
        // Extrair texto para indexação/busca
        // Verificar vírus/malware
        Log::info('Processing document file', ['file_path' => $this->filePath]);
        
        // Aqui você pode usar bibliotecas para gerar previews de PDFs, etc.
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('ProcessFileUpload job failed', [
            'file_path' => $this->filePath,
            'error' => $exception->getMessage()
        ]);
        
        // Limpar arquivo temporário em caso de falha
        if (Storage::exists($this->filePath)) {
            Storage::delete($this->filePath);
        }
    }
}
