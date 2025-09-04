<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UploadFileRequest;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadController extends Controller
{
    /**
     * Upload file
     */
    public function store(UploadFileRequest $request)
    {

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $extension = $file->getClientOriginalExtension();
        $mimeType = $file->getMimeType();
        $size = $file->getSize();
        
        // Generate unique filename
        $filename = Str::uuid() . '.' . $extension;
        
        // Determine file type based on mime type
        $type = $this->determineFileType($mimeType);
        
        // Store file (for now in local storage, can be changed to S3 later)
        $path = $file->storeAs('uploads', $filename, 'public');
        
        return response()->json([
            'id' => Str::uuid(),
            'filename' => $filename,
            'original_name' => $originalName,
            'path' => $path,
            'url' => Storage::url($path),
            'type' => $type,
            'mime_type' => $mimeType,
            'size' => $size,
            'created_at' => now(),
        ], 201);
    }
    
    /**
     * Determine file type based on mime type
     */
    private function determineFileType($mimeType)
    {
        if (str_starts_with($mimeType, 'image/')) {
            return 'image';
        }
        
        if (str_starts_with($mimeType, 'video/')) {
            return 'video';
        }
        
        if (str_starts_with($mimeType, 'audio/')) {
            return 'audio';
        }
        
        return 'document';
    }
}
