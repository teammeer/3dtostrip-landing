import { useState, useCallback, useEffect } from 'react';
import { SpriteStripData } from '../types';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

interface UseSpriteStripGeneratorOptions {
  onGenerate?: (data: SpriteStripData) => void;
  onSubmit?: (data: SpriteStripData) => Promise<void>;
  ratio?: '16:9' | '4:3' | '1:1' | 'auto';
  frameCount?: number;
  backgroundColor?: string;
  lightingIntensity?: number;
  ambientIntensity?: number;
  maxTextures?: number;
  acceptedFormats?: string[];
}

export const useSpriteStripGenerator = (options: UseSpriteStripGeneratorOptions = {}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedData, setGeneratedData] = useState<SpriteStripData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appliedTexture, setAppliedTexture] = useState<File | null>(null);

  // Texture management state
  const [textures, setTextures] = useState<File[]>([]);
  const [selectedTexture, setSelectedTexture] = useState<File | null>(null);
  const [texturePreviews, setTexturePreviews] = useState<Map<string, string>>(new Map());
  const [textureApplied, setTextureApplied] = useState<boolean>(false);

  // Dynamic canvas dimensions based on ratio
  const getCanvasDimensions = (ratio: string) => {
    switch (ratio) {
      case '16:9':
        return { width: 1920, height: 1080 };
      case '4:3':
        return { width: 1600, height: 1200 };
      case '1:1':
        return { width: 1080, height: 1080 };
      case 'auto':
        return { width: 1920, height: 1080 }; // Default
      default:
        return { width: 1920, height: 1080 };
    }
  };

  const generateSpriteStrip = useCallback(async (modelFile: File, textureFile?: File) => {
    if (!modelFile) return;

    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      const frameCount = options.frameCount || 18;
      const ratio = options.ratio || '16:9';
      const dimensions = getCanvasDimensions(ratio);

      // Create a unique model URL for this file
      const modelUrl = URL.createObjectURL(modelFile);

      // Load the 3D model
      setProgress(10);
      const model = await loadModel(modelUrl);

      // Use applied texture if available, otherwise use passed textureFile
      const textureToUse = appliedTexture || textureFile;
      if (textureToUse) {
        console.log('Applying texture to model:', textureToUse.name);
        try {
          await applyTextureToModel(model, textureToUse);
          console.log('Texture successfully applied to model');
        } catch (textureError) {
          console.warn('Failed to apply texture, continuing without texture:', textureError);
          // Continue generation without texture rather than failing completely
        }
      }

      // Generate frames with dynamic dimensions
      setProgress(20);
      const frames = await generateFrames(model, frameCount, dimensions, ratio, (progress) => {
        setProgress(20 + (progress * 0.7)); // 20-90% for frame generation
      });

      // Create sprite strip
      setProgress(90);
      const spriteStripUrl = await createSpriteStrip(frames, dimensions);

      setProgress(100);

      // Create sprite strip data with unique URL
      const spriteStripData: SpriteStripData = {
        id: `sprite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: modelFile.name.replace(/\.[^/.]+$/, ""),
        description: `Generated sprite strip from ${modelFile.name}`,
        spriteStripUrl, // Now using the actual generated sprite strip
        modelUrl,
        frameCount,
        ratio,
        createdAt: new Date().toISOString(),
        tags: ['generated', '3d-model'],
        metadata: {
          originalFileName: modelFile.name,
          fileSize: modelFile.size,
          fileType: modelFile.type,
          width: dimensions.width,
          height: dimensions.height,
          uniqueId: Math.random().toString(36).substr(2, 9)
        }
      };

      // Update state synchronously
      setGeneratedData(spriteStripData);
      setProgress(100);

      // Call callbacks after state is updated
      options.onGenerate?.(spriteStripData);

      // If onSubmit is provided, save to database
      if (options.onSubmit) {
        await options.onSubmit(spriteStripData);
      }

      return spriteStripData;
    } catch (error) {
      console.error('Sprite generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate sprite strip. Supported formats: GLTF, FBX, OBJ';
      setError(errorMessage);
      setGeneratedData(null);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [options, appliedTexture]);

  // Helper function to apply texture to 3D model
  const applyTextureToModel = async (model: THREE.Object3D, textureFile: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Create texture from file
      const textureUrl = URL.createObjectURL(textureFile);
      const textureLoader = new THREE.TextureLoader();

      textureLoader.load(
        textureUrl,
        (texture) => {
          console.log('Texture loaded successfully, applying to model...');

          // Apply texture to all meshes in the model
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              // Create a new material with the texture
              const material = new THREE.MeshLambertMaterial({
                map: texture,
                transparent: false
              });

              // Apply the material to the mesh
              child.material = material;

              console.log('Applied texture to mesh:', child.name || 'unnamed');
            }
          });

          // Clean up the texture URL
          URL.revokeObjectURL(textureUrl);

          console.log('Texture application completed');
          resolve();
        },
        undefined,
        (error) => {
          console.error('Failed to load texture:', error);
          URL.revokeObjectURL(textureUrl);
          reject(new Error('Failed to load texture file'));
        }
      );
    });
  };

  // Helper function to apply texture before sprite generation
  const applyTextureFromFile = useCallback(async (textureFile: File) => {
    if (!textureFile) {
      throw new Error('No texture file provided');
    }

    console.log('Texture prepared for sprite generation:', textureFile.name);

    // Store the texture file for use during sprite generation
    // This will be used when generateSpriteStrip is called
    setAppliedTexture(textureFile);
    setTextureApplied(true);

    return Promise.resolve();
  }, []);

  // Texture management functions
  const addTextures = useCallback((newTextures: File[]) => {
    const maxTextures = options.maxTextures || 10;
    const acceptedFormats = options.acceptedFormats || ['.png', '.jpg', '.jpeg', '.webp'];
    const remainingSlots = maxTextures - textures.length;

    const validTextures: File[] = [];
    newTextures.slice(0, remainingSlots).forEach((file) => {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (acceptedFormats.includes(fileExtension)) {
        validTextures.push(file);
      }
    });

    if (validTextures.length > 0) {
      const updatedTextures = [...textures, ...validTextures];
      setTextures(updatedTextures);

      // Generate previews for new textures
      const newPreviews = new Map(texturePreviews);
      validTextures.forEach((texture) => {
        if (!newPreviews.has(texture.name)) {
          const preview = URL.createObjectURL(texture);
          newPreviews.set(texture.name, preview);
        }
      });
      setTexturePreviews(newPreviews);

      // Auto-select the first texture if no texture is currently selected
      if (!selectedTexture && validTextures.length > 0) {
        const firstTexture = validTextures[0];
        setSelectedTexture(firstTexture);
        setAppliedTexture(firstTexture);
        setTextureApplied(false);
      }
    }
  }, [textures, texturePreviews, selectedTexture, options.maxTextures, options.acceptedFormats]);

  const removeTexture = useCallback((textureName: string) => {
    const updatedTextures = textures.filter(texture => texture.name !== textureName);
    setTextures(updatedTextures);

    // Clean up preview URL
    const preview = texturePreviews.get(textureName);
    if (preview) {
      URL.revokeObjectURL(preview);
      const newPreviews = new Map(texturePreviews);
      newPreviews.delete(textureName);
      setTexturePreviews(newPreviews);
    }

    // Reset selection if removed texture was selected
    if (selectedTexture?.name === textureName) {
      setSelectedTexture(null);
      setAppliedTexture(null);
      setTextureApplied(false);
    }
  }, [textures, texturePreviews, selectedTexture]);

  const clearAllTextures = useCallback(() => {
    // Clean up all preview URLs
    texturePreviews.forEach((url) => {
      URL.revokeObjectURL(url);
    });

    setTextures([]);
    setSelectedTexture(null);
    setAppliedTexture(null);
    setTextureApplied(false);
    setTexturePreviews(new Map());
  }, [texturePreviews]);

  const selectTexture = useCallback((texture: File | null) => {
    setSelectedTexture(texture);
    if (texture) {
      setAppliedTexture(texture);
      setTextureApplied(false); // Reset applied state when new texture is selected
    } else {
      setAppliedTexture(null);
      setTextureApplied(false);
    }
  }, []);

  const applySelectedTexture = useCallback(async () => {
    if (!selectedTexture) {
      throw new Error('No texture selected');
    }

    try {
      await applyTextureFromFile(selectedTexture);
      console.log('Selected texture applied successfully');
    } catch (error) {
      console.error('Failed to apply selected texture:', error);
      setTextureApplied(false);
      throw error;
    }
  }, [selectedTexture, applyTextureFromFile]);

  const getTexturePreview = useCallback((textureName: string) => {
    return texturePreviews.get(textureName) || null;
  }, [texturePreviews]);

  // Helper function to calculate optimal model positioning and scaling
  const calculateModelTransform = (
    model: THREE.Object3D,
    aspectRatio: number
  ): { scale: number; position: THREE.Vector3; cameraDistance: number } => {
    // Calculate bounding box with more precision
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Calculate the diagonal of the bounding box for more accurate scaling
    const diagonal = Math.sqrt(size.x * size.x + size.y * size.y + size.z * size.z);
    const maxDim = Math.max(size.x, size.y, size.z);

    // Use the larger of diagonal or max dimension for more conservative scaling
    const effectiveSize = Math.max(diagonal, maxDim);

    // Optimized scaling to ensure model fits perfectly in frame
    const framePadding = 0.05; // Minimal padding to prevent edge clipping
    const targetSize = 1.8 - (framePadding * 2); // Conservative target size
    const scale = targetSize / effectiveSize;

    // Calculate camera distance based on the frame's aspect ratio
    // This ensures the model fits properly regardless of aspect ratio
    const fov = 50; // Field of view in degrees
    const fovRad = (fov * Math.PI) / 180;

    // Calculate the required distance to fit the model
    const modelHeight = effectiveSize * scale;

    // Distance needed to fit model in frame
    const distanceForHeight = modelHeight / (2 * Math.tan(fovRad / 2));
    const distanceForWidth = modelHeight / (2 * Math.tan(fovRad / 2) * aspectRatio);

    // Use the larger distance to ensure model fits in both dimensions
    const cameraDistance = Math.max(distanceForHeight, distanceForWidth) * 1.1; // 10% buffer

    return {
      scale,
      position: center.clone().negate(), // Center the model at origin
      cameraDistance: Math.max(cameraDistance, 3.0) // Minimum distance
    };
  };

  // Helper function to load 3D model
  const loadModel = async (url: string): Promise<THREE.Object3D> => {
    return new Promise((resolve, reject) => {
      // Try GLTF first (most common format)
      const gltfLoader = new GLTFLoader();
      gltfLoader.load(
        url,
        (gltf: any) => resolve(gltf.scene),
        undefined,
        (gltfError: any) => {
          console.log('GLTF loading failed, trying FBX...', gltfError);

          // Try FBX loader
          const fbxLoader = new FBXLoader();
          fbxLoader.load(
            url,
            (fbx: any) => resolve(fbx),
            undefined,
            (fbxError: any) => {
              console.log('FBX loading failed, trying OBJ...', fbxError);

          // Try OBJ loader as fallback
          const objLoader = new OBJLoader();
          objLoader.load(
            url,
                (object: any) => resolve(object),
                undefined,
                (objError: any) => {
                  console.error('All model loaders failed:', { gltfError, fbxError, objError });
                  reject(new Error('Failed to load 3D model. Supported formats: GLTF, FBX, OBJ'));
                }
              );
            }
          );
        }
      );
    });
  };

  // Helper function to generate frames
  const generateFrames = async (
    model: THREE.Object3D,
    frameCount: number,
    dimensions: { width: number; height: number },
    ratio: string,
    onProgress: (progress: number) => void
  ): Promise<string[]> => {
    const frames: string[] = [];
    const canvas = document.createElement('canvas');
    canvas.setAttribute('data-sprite-generator', 'true');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    renderer.setSize(dimensions.width, dimensions.height);

    // Use the background color from options, default to white
    const backgroundColor = options.backgroundColor || '#ffffff';
    const color = new THREE.Color(backgroundColor);
    renderer.setClearColor(color, 1);

    const scene = new THREE.Scene();

    // Calculate aspect ratio based on the ratio setting
    const aspectRatio = ratio === '16:9' ? 16 / 9 :
                       ratio === '4:3' ? 4 / 3 :
                       ratio === '1:1' ? 1 :
                       16 / 9; // default to 16:9

    const camera = new THREE.PerspectiveCamera(50, aspectRatio, 0.1, 1000);

    // Enhanced lighting setup for better model visibility
    // Use dynamic lighting values from options
    const ambientIntensity = options.ambientIntensity || 0.8;
    const lightingIntensity = options.lightingIntensity || 1.0;

    const ambientLight = new THREE.AmbientLight(0x404040, ambientIntensity);
    const directionalLight = new THREE.DirectionalLight(0xffffff, lightingIntensity);
    directionalLight.position.set(2, 2, 2);
    directionalLight.castShadow = false;

    // Add fill light for better illumination
    const fillLight = new THREE.DirectionalLight(0xffffff, lightingIntensity * 0.4);
    fillLight.position.set(-1, 1, 1);

    // Add rim lighting for better definition
    const rimLight = new THREE.DirectionalLight(0xffffff, lightingIntensity * 0.3);
    rimLight.position.set(0, -1, 2);

    scene.add(ambientLight);
    scene.add(directionalLight);
    scene.add(fillLight);
    scene.add(rimLight);

    const modelClone = model.clone();
    scene.add(modelClone);

    // Calculate optimal transform using the helper function
    const transform = calculateModelTransform(modelClone, aspectRatio);

    // Apply the calculated transform
    modelClone.position.copy(transform.position);
    modelClone.scale.setScalar(transform.scale);

    // Recalculate bounding box after scaling to ensure perfect centering
    const scaledBox = new THREE.Box3().setFromObject(modelClone);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

    // Fine-tune positioning to ensure perfect centering at origin
    // This ensures the model is always centered at the origin (0,0,0)
    modelClone.position.sub(scaledCenter);

    // Verify the model is perfectly centered by checking its bounding box
    const finalBox = new THREE.Box3().setFromObject(modelClone);
    const finalCenter = finalBox.getCenter(new THREE.Vector3());

    // If the model is not perfectly centered, adjust it
    if (Math.abs(finalCenter.x) > 0.001 || Math.abs(finalCenter.y) > 0.001 || Math.abs(finalCenter.z) > 0.001) {
      modelClone.position.sub(finalCenter);
    }

    // Store the final centered position for consistent frame generation
    const finalCenteredPosition = modelClone.position.clone();

    // Position camera at optimal distance
    camera.position.set(0, 0, transform.cameraDistance);
    camera.lookAt(0, 0, 0);

    // Update camera projection matrix
    camera.updateProjectionMatrix();

    // Generate frames with consistent centering
    for (let i = 0; i < frameCount; i++) {
      const rotation = (i * (360 / frameCount) * Math.PI) / 180;

      // Reset model to original centered position before rotation
      modelClone.position.copy(finalCenteredPosition);
      modelClone.rotation.set(0, 0, 0); // Reset rotation

      // Apply only Y-axis rotation to maintain horizontal centering
      modelClone.rotation.y = rotation;

      // Double-check centering after rotation by recalculating bounding box
      const rotatedBox = new THREE.Box3().setFromObject(modelClone);
      const rotatedCenter = rotatedBox.getCenter(new THREE.Vector3());

      // If rotation caused any offset, correct it
      if (Math.abs(rotatedCenter.x) > 0.001 || Math.abs(rotatedCenter.y) > 0.001 || Math.abs(rotatedCenter.z) > 0.001) {
        modelClone.position.sub(rotatedCenter);
      }

      renderer.render(scene, camera);
      const dataUrl = canvas.toDataURL('image/png');
      frames.push(dataUrl);

      onProgress(i / frameCount);
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return frames;
  };

  // Helper function to create sprite strip
  const createSpriteStrip = async (frames: string[], dimensions: { width: number; height: number }): Promise<string> => {
    return new Promise((resolve) => {
      const stripCanvas = document.createElement('canvas');
      stripCanvas.setAttribute('data-sprite-generator', 'true');
      stripCanvas.width = dimensions.width * frames.length;
      stripCanvas.height = dimensions.height;
      const ctx = stripCanvas.getContext('2d')!;

      let loadedImages = 0;
      const images: HTMLImageElement[] = [];

      frames.forEach((frame, index) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, index * dimensions.width, 0, dimensions.width, dimensions.height);
          loadedImages++;

          if (loadedImages === frames.length) {
            resolve(stripCanvas.toDataURL('image/png'));
          }
        };
        img.src = frame;
        images.push(img);
      });
    });
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Clean up any remaining canvas elements
      const canvases = document.querySelectorAll('canvas[data-sprite-generator]');
      canvases.forEach(canvas => canvas.remove());

      // Clean up texture preview URLs
      texturePreviews.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [texturePreviews]);

  return {
    // Core sprite generation functions
    generateSpriteStrip,
    applyTextureFromFile,
    isGenerating,
    progress,
    generatedData,
    error,

    // Texture management state
    textures,
    selectedTexture,
    textureApplied,

    // Texture management functions
    addTextures,
    removeTexture,
    clearAllTextures,
    selectTexture,
    applySelectedTexture,
    getTexturePreview
  };
};
