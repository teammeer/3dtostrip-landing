"use client";

import React, { useState } from "react";
import { SpriteStripViewer } from "@teammeer.com/3dtostrip";
import SimpleTextureSelector from "@/components/SimpleTextureSelector";
import { useSpriteStripGenerator } from "@teammeer.com/3dtostrip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useFileUpload } from "@/hooks/use-file-upload";
import { AlertCircleIcon, ImageIcon, UploadIcon } from "lucide-react";

// Texture Upload Component
function TextureUploadArea({ onTexturesChange }: { onTexturesChange: (textures: File[]) => void; textures: File[] }) {
  const maxSizeMB = 5;
  const maxSize = maxSizeMB * 1024 * 1024;
  const maxFiles = 10;
  const prevFilesRef = React.useRef<string[]>([]);

  const [
    { files, isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps,
    },
  ] = useFileUpload({
    accept: "image/png,image/jpeg,image/jpg,image/webp",
    maxSize,
    multiple: true,
    maxFiles,
  });

  // Convert files to File objects and update parent only when files actually change
  React.useEffect(() => {
    const currentFileIds = files.map(f => f.id);
    const prevFileIds = prevFilesRef.current;

    // Only update if files have actually changed
    if (JSON.stringify(currentFileIds) !== JSON.stringify(prevFileIds)) {
      const fileObjects = files.map(f => f.file as File);
      onTexturesChange(fileObjects);
      prevFilesRef.current = currentFileIds;
    }
  }, [files, onTexturesChange]);

  return (
    <div className="flex flex-col gap-3">
      <Label className="text-sm font-medium">Texture Files (optional)</Label>
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        data-dragging={isDragging || undefined}
        data-files={files.length > 0 || undefined}
        className="relative flex min-h-52 flex-col items-center overflow-hidden rounded-xl border border-dashed border-input p-4 transition-colors not-data-[files]:justify-center has-[input:focus]:border-ring has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[dragging=true]:bg-accent/50"
      >
        <input
          {...getInputProps()}
          className="sr-only"
          aria-label="Upload texture files"
        />
        {files.length > 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
            <div
              className="mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border bg-background"
              aria-hidden="true"
            >
              <ImageIcon className="size-4 opacity-60" />
            </div>
            <p className="mb-1.5 text-sm font-medium">Files uploaded successfully</p>
            <p className="text-xs text-muted-foreground">
              {files.length} file{files.length > 1 ? 's' : ''} ready
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={openFileDialog}
              disabled={files.length >= maxFiles}
            >
              <UploadIcon className="-ms-1 opacity-60" aria-hidden="true" />
              Add more
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
            <div
              className="mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border bg-background"
              aria-hidden="true"
            >
              <ImageIcon className="size-4 opacity-60" />
            </div>
            <p className="mb-1.5 text-sm font-medium">Drop your textures here</p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, JPEG, WEBP (max. {maxSizeMB}MB)
            </p>
            <Button variant="outline" className="mt-4" onClick={openFileDialog}>
              <UploadIcon className="-ms-1 opacity-60" aria-hidden="true" />
              Select textures
            </Button>
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <div
          className="flex items-center gap-1 text-xs text-destructive"
          role="alert"
        >
          <AlertCircleIcon className="size-3 shrink-0" />
          <span>{errors[0]}</span>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [texture, setTexture] = useState<File | null>(null);
  const [ratio, setRatio] = useState<'16:9' | '4:3' | '1:1'>('4:3');
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
  const [lightingIntensity, setLightingIntensity] = useState<number>(1.0);
  const [ambientIntensity, setAmbientIntensity] = useState<number>(0.8);

  const {
    generateSpriteStrip,
    isGenerating,
    progress,
    generatedData,
    error,
    // Texture management from hook
    textures,
    selectedTexture,
    addTextures,
    selectTexture
  } = useSpriteStripGenerator({
    ratio,
    backgroundColor,
    lighting: {
      ambientLight: { intensity: ambientIntensity },
      directionalLight: { intensity: lightingIntensity, position: { x: 2, y: 2, z: 2 } }
    },
    maxTextures: 10,
    acceptedFormats: ['.png', '.jpg', '.jpeg', '.webp']
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    // Use selected texture from the texture selector, fallback to legacy texture
    const textureToUse = selectedTexture || texture;
    await generateSpriteStrip(file, textureToUse ?? undefined);
  };


  const handleTexturesChange = (newTextures: File[]) => {
    addTextures(newTextures);
  };

  const handleTextureSelect = (texture: File | null) => {
    selectTexture(texture);
    if (texture) {
      setTexture(texture);
    }
  };


  const handleDownload = () => {
    if (!generatedData?.spriteStripUrl) return;
    const link = document.createElement('a');
    const fileName = `${generatedData.title || 'sprite'}.png`;
    link.href = generatedData.spriteStripUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get dynamic aspect ratio class based on selected ratio
  const getAspectRatioClass = (ratio: string) => {
    switch (ratio) {
      case '16:9':
        return 'aspect-video'; // 16:9 aspect ratio
      case '4:3':
        return 'aspect-[4/3]'; // 4:3 aspect ratio
      case '1:1':
        return 'aspect-square'; // 1:1 aspect ratio
      default:
        return 'aspect-[4/3]'; // Default to 4:3
    }
  };

  return (
    <div className="flex-1 p-6 bg-white">
      <div className="container mx-auto h-full">
        <h1 className="text-2xl font-semibold mb-6 text-gray-900">3D To Strip Generator</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col gap-3">
            <Label htmlFor="model-file" className="text-sm font-medium">3D Model File (.gltf/.glb/.fbx/.obj)</Label>
            <Input
              id="model-file"
              type="file"
              accept=".gltf,.glb,.fbx,.obj"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </div>

          {/* Texture Upload Area */}
          <TextureUploadArea
            onTexturesChange={handleTexturesChange}
            textures={textures}
          />

          {/* Simple Texture Selector */}
          <div className="border p-4 rounded-lg bg-white">
            <SimpleTextureSelector
              textures={textures}
              selectedTexture={selectedTexture}
              onTexturesChange={handleTexturesChange}
              onTextureSelect={handleTextureSelect}
              maxTextures={10}
            />
          </div>


          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <Label htmlFor="aspect-ratio" className="text-sm font-medium">Aspect Ratio</Label>
              <select
                id="aspect-ratio"
                value={ratio}
                onChange={(e) => setRatio(e.target.value as '16:9' | '4:3' | '1:1')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="16:9">16:9</option>
                <option value="4:3">4:3</option>
                <option value="1:1">1:1</option>
              </select>
            </div>

            <div className="flex flex-col gap-3">
              <Label htmlFor="background-color" className="text-sm font-medium">Background Color</Label>
              <Input
                id="background-color"
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="h-10 w-full p-1"
                aria-label="Background color"
              />
            </div>
          </div>

          {/* Lighting Controls */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Lighting Controls</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="*:not-first:mt-4">
                <Label className="text-sm font-medium">
                  Lighting Intensity: {lightingIntensity.toFixed(1)}x
                </Label>
                <Slider
                  value={[lightingIntensity]}
                  onValueChange={(value) => setLightingIntensity(value[0])}
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  aria-label="Lighting intensity slider"
                />
              </div>

              <div className="*:not-first:mt-4">
                <Label className="text-sm font-medium">
                  Ambient Light: {ambientIntensity.toFixed(1)}x
                </Label>
                <Slider
                  value={[ambientIntensity]}
                  onValueChange={(value) => setAmbientIntensity(value[0])}
                  min={0.1}
                  max={2.0}
                  step={0.1}
                  aria-label="Ambient light intensity slider"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isGenerating || !file}
          >
            {isGenerating
              ? `Generating... ${Math.round(progress)}%`
              : selectedTexture
                ? `Generate Sprite Strip`
                : 'Generate Sprite Strip'
            }
          </Button>

              {error && (
                <p className="text-red-600 text-sm">{error}</p>
              )}
            </form>
          </div>

          {/* Viewer Section */}
          <div>

            {generatedData?.spriteStripUrl ? (
              <>
                <div
                  className={`w-full border rounded overflow-hidden ${getAspectRatioClass(generatedData.ratio || '16:9')}`}
                  style={{ backgroundColor: backgroundColor }}
                >
                  <SpriteStripViewer
                    spriteStripUrl={generatedData.spriteStripUrl}
                    ratio={generatedData.ratio as '16:9' | '4:3' | '1:1' | 'auto'}
                  />
                </div>
                <div className="mt-4">
                  <Button
                    type="button"
                    onClick={handleDownload}
                    className=""
                  >
                    Download Sprite Strip
                  </Button>
                </div>
              </>
            ) : (
              <div
                className="w-full border rounded overflow-hidden aspect-[4/3]"
                style={{ backgroundColor: '#f3f4f6' }}
              >
                <SpriteStripViewer
                  spriteStripUrl="/assassin.png"
                  ratio="4:3"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
