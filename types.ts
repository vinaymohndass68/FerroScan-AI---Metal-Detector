
export interface SensorData {
  x: number;
  y: number;
  z: number;
  total: number;
  timestamp: number;
}

export interface MetalAnalysis {
  detected: boolean;
  type: string;
  confidence: number;
  properties: string[];
  description: string;
  magneticLikelihood: 'High' | 'Medium' | 'Low' | 'None';
}

export enum AppMode {
  DETECTOR = 'DETECTOR',
  SCANNER = 'SCANNER',
  HISTORY = 'HISTORY'
}
