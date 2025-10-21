"use client";

import React from "react";
import { X, Check } from "lucide-react";

interface SimpleTextureSelectorProps {
  textures: File[];
  selectedTexture: File | null;
  onTexturesChange: (textures: File[]) => void;
  onTextureSelect: (texture: File | null) => void;
  maxTextures?: number;
  className?: string;
}

const SimpleTextureSelector: React.FC<SimpleTextureSelectorProps> = ({
  textures,
  selectedTexture,
  onTexturesChange,
  onTextureSelect,
  maxTextures = 10,
  className = ""
}) => {
  const removeTexture = (textureName: string) => {
    const updatedTextures = textures.filter(texture => texture.name !== textureName);
    onTexturesChange(updatedTextures);

    if (selectedTexture?.name === textureName) {
      onTextureSelect(null);
    }
  };

  const clearAll = () => {
    onTexturesChange([]);
    onTextureSelect(null);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Texture Grid */}
      {textures.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">
              Textures ({textures.length}/{maxTextures})
            </h3>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {textures.map((texture) => {
              const isSelected = selectedTexture === texture;
              const preview = URL.createObjectURL(texture);

              return (
                <div
                  key={texture.name}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => onTextureSelect(isSelected ? null : texture)}
                >
                  <img
                    src={preview}
                    alt={texture.name}
                    className="w-full h-full object-cover"
                  />

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-1 right-1 h-4 w-4 bg-blue-500 text-white rounded-full flex items-center justify-center">
                      <Check size={10} />
                    </div>
                  )}

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTexture(texture.name);
                    }}
                    className="absolute top-1 left-1 h-4 w-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                  >
                    <X size={8} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Selected Texture Info */}


          {textures.length >= maxTextures && (
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
              Maximum number of textures reached ({maxTextures})
            </div>
          )}
        </div>
      )}

      {textures.length === 0 && (
        <div className="text-center ">

          <p className="text-sm">No textures uploaded</p>
        </div>
      )}
    </div>
  );
};

export default SimpleTextureSelector;
