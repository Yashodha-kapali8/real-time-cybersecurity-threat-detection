import { threatService } from './threatService';
import { xgboostModel } from './xgboostModelLoader';
import { supabase } from '@/integrations/supabase/client';

// Constants
const CAPTURE_INTERVAL = 500; // ms
const MIN_CONFIDENCE = 0.6;
const DEFAULT_INTERFACE = 'eth0';
const LOCAL_IPS = [
  '192.168.1.105',
  '10.0.0.25',
  '172.16.0.12',
  '127.0.0.1'
];
const EXTERNAL_IPS = [
  '8.8.8.8',
  '1.1.1.1',
  '208.67.222.222',
  '151.101.193.140',
  '185.199.108.153'
];
const PROTOCOLS = ['TCP', 'UDP', 'HTTP', 'HTTPS', 'SSH', 'FTP', 'DNS', 'ICMP'] as const;
const COMMON_PORTS = [21, 22, 23, 25, 53, 79, 80, 110, 111, 135, 139, 143, 443, 993, 995];

// Types and interfaces
export type Protocol = typeof PROTOCOLS[number];
export type AttackType = 'DoS' | 'Probe' | 'R2L' | 'U2R' | 'Normal';
export type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export interface PacketData {
  timestamp: string;
  sourceIP: string;
  destinationIP: string;
  protocol: Protocol;
  sourcePort: number;
  destinationPort: number;
  packetSize: number;
  flags?: string;
  payload?: string;
}

export interface ThreatDetection {
  type: AttackType;
  confidence: number;
  riskLevel: RiskLevel;
  attackCategory?: string;
  description: string;
}

interface AttackPattern {
  type: AttackType;
  patterns: string[];
  ports: number[];
  packetSizes: number[];
  confidence: number;
}

interface Features {
  packetSize: number;
  port: number;
  protocol: Protocol;
  isHighPort: boolean;
  isCommonPort: boolean;
  hasFlags: boolean;
  hasPayload: boolean;
  timestamp: number;
}

interface PacketPrediction {
  isAttack: boolean;
  attackType: AttackType;
  confidence: number;
}

const ATTACK_PATTERNS: Record<AttackType, AttackPattern> = {
  DoS: {
    type: 'DoS',
    patterns: ['flood', 'syn_flood', 'ping_of_death', 'teardrop'],
    ports: [80, 443, 21, 22, 25],
    packetSizes: [1500, 65536, 8192],
    confidence: 0.85
  },
  Probe: {
    type: 'Probe',
    patterns: ['port_scan', 'ip_scan', 'nmap', 'satan'],
    ports: [22, 23, 53, 79, 111, 135, 139, 445],
    packetSizes: [64, 128, 256],
    confidence: 0.78
  },
  R2L: {
    type: 'R2L',
    patterns: ['ftp_write', 'guess_passwd', 'imap', 'phf', 'multihop'],
    ports: [21, 23, 25, 53, 79, 80, 143],
    packetSizes: [512, 1024, 2048],
    confidence: 0.72
  },
  U2R: {
    type: 'U2R',
    patterns: ['buffer_overflow', 'rootkit', 'perl', 'xterm'],
    ports: [22, 23, 79, 80, 512, 513, 514],
    packetSizes: [1024, 2048, 4096],
    confidence: 0.68
  },
  Normal: {
    type: 'Normal',
    patterns: [],
    ports: [],
    packetSizes: [],
    confidence: 0.95
  }
};

export class PacketCaptureService {
  private isCapturing = false;
  private captureInterval: NodeJS.Timeout | null = null;
  private mlModel: any = null;
  private subscribers = new Set<(packet: PacketData, detection: ThreatDetection) => void>();
  private errorHandlers = new Set<(error: Error) => void>();
  private isDestroyed = false;

  constructor() {
    this.init().catch(error => {
      console.error('Failed to initialize PacketCaptureService:', error);
      throw error;
    });
  }

  private async init(): Promise<void> {
    try {
      const modelTrained = await xgboostModel.isModelTrained();
      if (!modelTrained) {
        throw new Error('ML model not trained. Please run training.py first.');
      }
      this.mlModel = xgboostModel;
    } catch (error) {
      console.error('Error initializing ML model:', error);
      throw error;
    }
  }

  public async startCapture(interfaceName: string = DEFAULT_INTERFACE): Promise<void> {
    if (this.isCapturing || this.isDestroyed) {
      return;
    }

    this.cleanup();

    try {
      if (!this.mlModel) {
        await this.init();
      }

      this.isCapturing = true;
      console.log('Starting packet capture...');

      this.captureInterval = setInterval(async () => {
        if (!this.isCapturing || this.isDestroyed) {
          this.cleanup();
          return;
        }

        try {
          const packet = await this.capturePacket();
          const detection = await this.detectThreat(packet);
          await this.processPacket(packet, detection);
        } catch (error) {
          this.onError(error as Error);
        }
      }, CAPTURE_INTERVAL);

    } catch (error) {
      this.onError(error as Error);
      throw error;
    }
  }

  private async processPacket(packet: PacketData, detection: ThreatDetection): Promise<void> {
    try {
      await this.storePacketData(packet, detection);
      await this.notifySubscribers(packet, detection);
    } catch (error) {
      this.onError(error as Error);
    }
  }

  private async storePacketData(packet: PacketData, detection: ThreatDetection): Promise<void> {
    try {
      // Store network traffic and use DB default timestamp (server time)
      const netRow: any = await threatService.createNetworkTraffic({
        source_ip: packet.sourceIP,
        destination_ip: packet.destinationIP,
        protocol: packet.protocol,
        source_port: packet.sourcePort,
        destination_port: packet.destinationPort,
        packet_size: packet.packetSize,
        classification: detection.type.toLowerCase(),
        ml_confidence: detection.confidence,
        flags: packet.flags
      });

      // Store threat if detected
      if (detection.type !== 'Normal') {
        const threatRow: any = await threatService.createThreatLog({
          threat_type: detection.type,
          severity: detection.riskLevel,
          source_ip: packet.sourceIP,
          destination_ip: packet.destinationIP,
          protocol: packet.protocol,
          port: packet.destinationPort,
          // Prefer DB timestamp from the inserted network_traffic row, fall back to nothing (DB will set now())
          timestamp: netRow?.timestamp,
          status: 'detected',
          confidence_score: Math.round(detection.confidence * 100),
          description: detection.description,
          packet_size: packet.packetSize
        });

        if (detection.riskLevel === 'Critical') {
          await this.sendThreatAlert(packet, detection, threatRow?.timestamp);
        }
      }
    } catch (error) {
      console.error('Error storing packet data:', error);
      throw error;
    }
  }

  private async sendThreatAlert(packet: PacketData, detection: ThreatDetection, timestampArg?: string): Promise<void> {
    try {
      const { data: configData } = await supabase
        .from('system_config')
        .select('*')
        .single();

      if (configData?.email_alerts && configData?.alert_email) {
        const email = configData.alert_email;
        const isValidEmail = (e: any) => {
          if (!e || typeof e !== 'string') return false;
          const s = e.trim();
          const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return re.test(s);
        };

        if (!isValidEmail(email)) {
          console.warn('Configured alert_email is invalid, skipping email send:', String(email));
          return;
        }

        // Use the server-side timestamp if available (from inserted row)
        const timestampToSend = timestampArg || packet.timestamp || new Date().toISOString();

        await supabase.functions.invoke('send-threat-alert', {
          body: {
            email,
            threatType: detection.type,
            severity: detection.riskLevel,
            sourceIp: packet.sourceIP,
            destinationIp: packet.destinationIP,
            timestamp: timestampToSend,
            description: detection.description,
            confidenceScore: Math.round(detection.confidence * 100)
          }
        });
        console.log(`📧 Critical threat email sent to ${email}`);
      }
    } catch (error) {
      console.error('Failed to send threat email:', error);
    }
  }

  private async notifySubscribers(packet: PacketData, detection: ThreatDetection): Promise<void> {
    await Promise.all(
      Array.from(this.subscribers).map(async (callback) => {
        try {
          await callback(packet, detection);
        } catch (error) {
          console.error('Error in packet capture callback:', error);
        }
      })
    );
  }

  private capturePacket(): PacketData {
    const isInbound = Math.random() > 0.5;
    const sourceIP = isInbound 
      ? EXTERNAL_IPS[Math.floor(Math.random() * EXTERNAL_IPS.length)]
      : LOCAL_IPS[Math.floor(Math.random() * LOCAL_IPS.length)];
    
    const destinationIP = isInbound
      ? LOCAL_IPS[Math.floor(Math.random() * LOCAL_IPS.length)]
      : EXTERNAL_IPS[Math.floor(Math.random() * EXTERNAL_IPS.length)];

    return {
      timestamp: new Date().toISOString(),
      sourceIP,
      destinationIP,
      protocol: PROTOCOLS[Math.floor(Math.random() * PROTOCOLS.length)],
      sourcePort: Math.floor(Math.random() * 65535) + 1,
      destinationPort: Math.floor(Math.random() * 65535) + 1,
      packetSize: Math.floor(Math.random() * 1500) + 64,
      flags: Math.random() > 0.7 ? 'SYN,ACK' : undefined,
      payload: Math.random() > 0.8 ? 'encrypted_payload' : undefined
    };
  }

  private async detectThreat(packet: PacketData): Promise<ThreatDetection> {
    try {
      const prediction = await this.mlModel.predictThreatLevel({
        packetSize: packet.packetSize,
        protocol: packet.protocol,
        destinationPort: packet.destinationPort,
        flags: packet.flags
      });

      if (prediction.isAttack && prediction.confidence > MIN_CONFIDENCE) {
        return {
          type: prediction.attackType,
          confidence: prediction.confidence,
          riskLevel: this.calculateRiskLevel(prediction.confidence),
          attackCategory: this.getAttackCategory(prediction.attackType),
          description: `${prediction.attackType} attack detected (${(prediction.confidence * 100).toFixed(1)}% confidence)`
        };
      } else {
        return this.patternBasedDetection(packet);
      }
    } catch (error) {
      console.error('Error in threat detection:', error);
      return this.patternBasedDetection(packet);
    }
  }

  private patternBasedDetection(packet: PacketData): ThreatDetection {
    const features = this.extractFeatures(packet);
    let bestMatch = { 
      type: 'Normal' as AttackType,
      confidence: 0,
      score: 0 
    };

    for (const [attackType, config] of Object.entries(ATTACK_PATTERNS)) {
      const score = this.calculateAttackScore(features, config);
      if (score > bestMatch.score) {
        bestMatch = {
          type: attackType as AttackType,
          confidence: config.confidence * score,
          score
        };
      }
    }

    if (bestMatch.score >= MIN_CONFIDENCE) {
      return {
        type: bestMatch.type,
        confidence: bestMatch.confidence,
        riskLevel: this.calculateRiskLevel(bestMatch.confidence),
        attackCategory: this.getAttackCategory(bestMatch.type),
        description: `${bestMatch.type} attack detected (${(bestMatch.confidence * 100).toFixed(1)}% confidence)`
      };
    }

    return {
      type: 'Normal',
      confidence: 0.95,
      riskLevel: 'Low',
      description: 'Normal network traffic patterns verified'
    };
  }

  private calculateAttackScore(features: Features, config: AttackPattern): number {
    let score = 0;
    
    // Port analysis (0.3)
    if (config.ports.includes(features.port)) {
      score += 0.3;
    } else if (features.isCommonPort) {
      score += 0.1;
    }
    
    // Packet size analysis (0.3)
    const sizeMatch = config.packetSizes.some((size: number) => 
      Math.abs(features.packetSize - size) < 200
    );
    if (sizeMatch) score += 0.3;
    
    // Protocol-based scoring (0.2)
    if (features.protocol === 'TCP' && ['DoS', 'R2L'].includes(config.type)) {
      score += 0.2;
    } else if (features.protocol === 'ICMP' && config.type === 'Probe') {
      score += 0.2;
    } else if (['TCP', 'UDP'].includes(features.protocol)) {
      score += 0.1;
    }
    
    // Additional indicators (0.2)
    if (features.hasFlags && ['DoS', 'Probe'].includes(config.type)) {
      score += 0.1;
    }
    if (features.hasPayload && config.type === 'R2L') {
      score += 0.1;
    }
    
    return score;
  }

  private extractFeatures(packet: PacketData): Features {
    return {
      packetSize: packet.packetSize,
      port: packet.destinationPort,
      protocol: packet.protocol,
      isHighPort: packet.destinationPort > 1024,
      isCommonPort: COMMON_PORTS.includes(packet.destinationPort),
      hasFlags: !!packet.flags,
      hasPayload: !!packet.payload,
      timestamp: new Date(packet.timestamp).getTime()
    };
  }

  private calculateRiskLevel(confidence: number): RiskLevel {
    if (confidence >= 0.9) return 'Critical';
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.7) return 'Medium';
    return 'Low';
  }

  private getAttackCategory(attackType: string): string {
    const categories: Record<string, string> = {
      'DoS': 'Denial of Service',
      'Probe': 'Reconnaissance/Probing',
      'R2L': 'Remote to Local',
      'U2R': 'User to Root'
    };
    return categories[attackType] || 'Unknown';
  }

  private cleanup(): void {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }
  }

  private onError(error: Error): void {
    console.error('PacketCaptureService error:', error);
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (e) {
        console.error('Error in error handler:', e);
      }
    });
  }

  public stopCapture(): void {
    if (!this.isCapturing) {
      return;
    }

    this.isCapturing = false;
    this.cleanup();
    console.log('Packet capture stopped');
  }

  public isActive(): boolean {
    return this.isCapturing && !this.isDestroyed;
  }

  public subscribe(callback: (packet: PacketData, detection: ThreatDetection) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  public addErrorHandler(handler: (error: Error) => void): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.cleanup();
    this.subscribers.clear();
    this.errorHandlers.clear();
  }
}

export const packetCapture = new PacketCaptureService();