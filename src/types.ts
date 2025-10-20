export interface SpriteStripData {
  id: string;
  title: string;
  description: string;
  spriteStripUrl: string; // data URL of the generated sprite strip image
  modelUrl: string; // object URL of the uploaded model file
  frameCount: number;
  ratio: '16:9' | '4:3' | '1:1' | 'auto';
  createdAt: string;
  tags: string[];
  metadata: {
    originalFileName: string;
    fileSize: number;
    fileType: string;
    width: number;
    height: number;
    uniqueId: string;
  };
}

