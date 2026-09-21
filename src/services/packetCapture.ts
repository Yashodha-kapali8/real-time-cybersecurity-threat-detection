import { threatService } from './threatService';
import { xgboostModel } from './xgboostModelLoader';
import { supabase } from '@/integrations/supabase/client';

// Constants
const CAPTURE_INTERVAL = 500; // ms
const DEFAULT_INTERFACE = 'eth0';

// Types
export type Protocol = 'TCP' | 'UDP' | 'HTTP' | 'HTTPS' | 'SSH' | 'FTP' | 'DNS' | 'ICMP';
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
  patterns: string[];
  ports: number[];
  packetSizes: number[];
  confidence: number;
}

const ATTACK_PATTERNS: Record<AttackType, AttackPattern> = {
  DoS: {
    patterns: ['flood', 'syn_flood', 'ping_of_death', 'teardrop'],
    ports: [80, 443, 21, 22, 25],
    packetSizes: [1500, 65536, 8192],
    confidence: 0.85
  },
  Probe: {
    patterns: ['port_scan', 'ip_scan', 'nmap', 'satan'],
    ports: [22, 23, 53, 79, 111, 135, 139, 445],
    packetSizes: [64, 128, 256],
    confidence: 0.78
  },
  R2L: {
    patterns: ['ftp_write', 'guess_passwd', 'imap', 'phf', 'multihop'],
    ports: [21, 23, 25, 53, 79, 80, 143],
    packetSizes: [512, 1024, 2048],
    confidence: 0.72
  },
  U2R: {
    patterns: ['buffer_overflow', 'rootkit', 'perl', 'xterm'],
    ports: [22, 23, 79, 80, 512, 513, 514],
    packetSizes: [1024, 2048, 4096],
    confidence: 0.68
  },
  Normal: {
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
    // bind methods used as callbacks
    this.cleanup = this.cleanup.bind(this);
    this.startCapture = this.startCapture.bind(this);
    this.stopCapture = this.stopCapture.bind(this);
  }

  // Ensure confidence values fit DECIMAL(5,4) in the DB: convert percentages to 0..1 and clamp
  private normalizeConfidence(raw: any): number {
    let n = Number(raw);
    if (!isFinite(n) || isNaN(n)) n = 0;
    // if value looks like a percent (e.g. 85), convert to 0.85
    if (n > 1) n = n / 100;
    // clamp to valid range for DECIMAL(5,4) (absolute < 10^1). We expect 0..1 logically.
    if (n < 0) n = 0;
    if (n > 0.9999) n = 0.9999;
    return Number(n.toFixed(4));
  }

  // Simple email validation helper used before invoking the email function
  private isValidEmail(email: any): boolean {
    if (!email || typeof email !== 'string') return false;
    const s = email.trim();
    // basic RFC-like check (sufficient for UI/server-side guard)
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(s);
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
    if (this.isCapturing || this.isDestroyed) return;

    this.cleanup();

    try {
      if (!this.mlModel) await this.init();

      this.isCapturing = true;
      console.log('Starting packet capture... (simulated)');

      this.captureInterval = setInterval(async () => {
        if (!this.isCapturing || this.isDestroyed) {
          this.cleanup();
          return;
        }

        try {
          const packet = this.capturePacket();
          const detection = await this.detectThreat(packet);

          // store and notify (fire-and-forget to avoid blocking the capture loop)
          try {
            // Normalize fields to match DB schema (classification and severity checks, numeric precision)
            // Normalize classification to allowed DB values
            let classification = 'suspicious';
            try {
              const t = (detection.type || '').toString().toLowerCase();
              if (t === 'normal') classification = 'normal';
              else if (detection.riskLevel === 'Critical' || t === 'dos' || t === 'ddos' || t === 'attack') classification = 'attack';
              else classification = 'suspicious';
            } catch { classification = 'suspicious'; }

            const mlConfidence = this.normalizeConfidence(detection.confidence);

            threatService.createNetworkTraffic({
              source_ip: packet.sourceIP,
              destination_ip: packet.destinationIP,
              protocol: packet.protocol,
              source_port: packet.sourcePort,
              destination_port: packet.destinationPort,
              packet_size: packet.packetSize,
              classification,
              ml_confidence: mlConfidence,
              timestamp: packet.timestamp,
              flags: packet.flags
            }).catch(storeErr => console.error('Error storing packet data (async):', storeErr));

            if (detection.type !== 'Normal') {
              // The DB expects severity values in lowercase and confidence as a decimal (precision 5,4)
              const severity = (detection.riskLevel || 'Low').toString().toLowerCase();
              const confidenceScore = this.normalizeConfidence(detection.confidence);

              threatService.createThreatLog({
                threat_type: detection.type,
                severity,
                source_ip: packet.sourceIP,
                destination_ip: packet.destinationIP,
                protocol: packet.protocol,
                port: packet.destinationPort,
                timestamp: packet.timestamp,
                status: 'detected',
                confidence_score: confidenceScore,
                description: detection.description,
                packet_size: packet.packetSize
              }).catch(logErr => console.error('Error creating threat log (async):', logErr));

              if (detection.riskLevel === 'Critical') {
                // Email alerts are non-blocking; run asynchronously
                (async () => {
                  try {
                    const { data: configData } = await supabase
                      .from('system_config')
                      .select('*')
                      .single();

                    if (configData?.email_alerts && configData?.alert_email) {
                      const email = configData.alert_email;
                      if (!this.isValidEmail(email)) {
                        console.warn('Configured alert_email is invalid, skipping email send:', String(email));
                      } else {
                        try {
                          await supabase.functions.invoke('send-threat-alert', {
                            body: {
                              email,
                              threatType: detection.type,
                              severity: detection.riskLevel,
                              sourceIp: packet.sourceIP,
                              destinationIp: packet.destinationIP,
                              timestamp: packet.timestamp,
                              description: detection.description,
                              // send normalized decimal confidence to the function (0..1, 4 dp)
                              confidenceScore: this.normalizeConfidence(detection.confidence)
                            }
                          });
                          console.log(`📧 Critical threat email sent to ${email}`);
                        } catch (emailError) {
                          console.error('Failed to send threat email (async):', emailError);
                        }
                      }
                    }
                  } catch (emailError) {
                    console.error('Failed to read system_config (async):', emailError);
                  }
                })();
              }
            }
          } catch (storeErr) {
            // Shouldn't block capture loop; just log
            console.error('Error initiating storage/notification (non-fatal):', storeErr);
          }

          // notify subscribers synchronously (do not await subscriber results)
          try {
            for (const cb of this.subscribers) {
              try {
                // invoke callback but don't await; subscribers should be resilient
                // schedule asynchronously to avoid blocking
                setTimeout(() => {
                  try {
                    cb(packet, detection);
                  } catch (cbErr) {
                    console.error('Subscriber callback error:', cbErr);
                  }
                }, 0);
              } catch (invokeErr) {
                console.error('Failed to schedule subscriber callback:', invokeErr);
              }
            }
          } catch (notifyErr) {
            console.error('Error notifying subscribers:', notifyErr);
          }
        } catch (err) {
          console.error('Error during detection or processing:', err);
          this.errorHandlers.forEach(handler => handler(err as Error));
        }
      }, CAPTURE_INTERVAL);
    } catch (error) {
      console.error('Error starting capture:', error);
      throw error;
    }
  }

  public stopCapture(): void {
    if (!this.isCapturing) return;
    this.isCapturing = false;
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }
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

  private getLocalIPs(): string[] {
    return ['192.168.1.105', '10.0.0.25', '172.16.0.12', '127.0.0.1'];
  }

  private capturePacket(): PacketData {
    const protocols: Protocol[] = ['TCP', 'UDP', 'HTTP', 'HTTPS', 'SSH', 'FTP', 'DNS', 'ICMP'];
    const localIPs = this.getLocalIPs();
    const externalIPs = ['8.8.8.8', '1.1.1.1', '208.67.222.222', '151.101.193.140', '185.199.108.153', '140.82.112.4', '192.30.253.113'];

    const isInbound = Math.random() > 0.5;
    const sourceIP = isInbound ? externalIPs[Math.floor(Math.random() * externalIPs.length)] : localIPs[Math.floor(Math.random() * localIPs.length)];
    const destinationIP = isInbound ? localIPs[Math.floor(Math.random() * localIPs.length)] : externalIPs[Math.floor(Math.random() * externalIPs.length)];

    return {
      timestamp: new Date().toISOString(),
      sourceIP,
      destinationIP,
      protocol: protocols[Math.floor(Math.random() * protocols.length)],
      sourcePort: Math.floor(Math.random() * 65535) + 1,
      destinationPort: Math.floor(Math.random() * 65535) + 1,
      packetSize: Math.floor(Math.random() * 1500) + 64,
      flags: Math.random() > 0.7 ? 'SYN,ACK' : undefined,
      payload: Math.random() > 0.8 ? 'encrypted_payload' : undefined
    };
  }

  private cleanup(): void {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }
    this.isCapturing = false;
  }

  private async detectThreat(packet: PacketData): Promise<ThreatDetection> {
    try {
      if (xgboostModel.isModelTrainedSync && xgboostModel.isModelTrainedSync()) {
        const prediction = xgboostModel.predictThreatLevel({
          packetSize: packet.packetSize,
          protocol: packet.protocol,
          destinationPort: packet.destinationPort,
          flags: packet.flags
        });

        if (prediction.isAttack) {
          return {
            type: prediction.attackType as AttackType,
            confidence: prediction.confidence,
            riskLevel: this.calculateRiskLevel(prediction.confidence),
            attackCategory: this.getAttackCategory(prediction.attackType),
            description: `Trained model detected ${prediction.attackType} attack (${(prediction.confidence * 100).toFixed(1)}% confidence)`
          };
        }

        return {
          type: 'Normal',
          confidence: prediction.confidence,
          riskLevel: 'Low',
          description: 'Normal network traffic verified by trained model'
        };
      }

      // fallback to pattern-based
      return this.patternBasedDetection(packet);
    } catch (error) {
      console.error('Model detection error:', error);
      throw error;
    }
  }

  private patternBasedDetection(packet: PacketData): ThreatDetection {
    const features = this.extractFeatures(packet);
    let bestMatch = { type: 'Normal' as AttackType, confidence: 0, score: 0 };

    for (const [attackType, config] of Object.entries(ATTACK_PATTERNS)) {
      const score = this.calculateAttackScore(features, config as AttackPattern);
      if (score > bestMatch.score) {
        bestMatch = { type: attackType as AttackType, confidence: (config as AttackPattern).confidence * score, score };
      }
    }

    if (bestMatch.score >= 0.6) {
      return {
        type: bestMatch.type,
        confidence: bestMatch.confidence,
        riskLevel: this.calculateRiskLevel(bestMatch.confidence),
        attackCategory: this.getAttackCategory(bestMatch.type),
        description: `${bestMatch.type} attack detected (${(bestMatch.confidence * 100).toFixed(1)}% confidence)`
      };
    }

    return { type: 'Normal', confidence: 0.95, riskLevel: 'Low', description: 'Normal network traffic patterns verified' };
  }

  private calculateAttackScore(features: any, config: AttackPattern): number {
    let score = 0;
    if (config.ports.includes(features.port)) score += 0.3;
    else if (features.isCommonPort) score += 0.1;

    const sizeMatch = config.packetSizes.some(s => Math.abs(features.packetSize - s) < 200);
    if (sizeMatch) score += 0.3;

    if (features.protocol === 'TCP' && ['DoS', 'R2L'].includes((config as any).type)) score += 0.2;
    else if (features.protocol === 'ICMP' && (config as any).type === 'Probe') score += 0.2;
    else if (['TCP', 'UDP'].includes(features.protocol)) score += 0.1;

    if (features.hasFlags && ['DoS', 'Probe'].includes((config as any).type)) score += 0.1;
    if (features.hasPayload && (config as any).type === 'R2L') score += 0.1;

    return score;
  }

  private extractFeatures(packet: PacketData) {
    return {
      packetSize: packet.packetSize,
      port: packet.destinationPort,
      protocol: packet.protocol,
      isHighPort: packet.destinationPort > 1024,
      isCommonPort: [21, 22, 23, 25, 53, 79, 80, 110, 111, 135, 139, 143, 443, 993, 995].includes(packet.destinationPort),
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

  private getAttackCategory(attackType: AttackType | string): string {
    const categories: Record<string, string> = {
      DoS: 'Denial of Service',
      Probe: 'Reconnaissance/Probing',
      R2L: 'Remote to Local',
      U2R: 'User to Root',
      Normal: 'Normal'
    };
    return categories[attackType] || 'Unknown';
  }

  private onError(error: Error): void {
    try {
      this.errorHandlers.forEach(handler => handler(error));
    } catch (err) {
      console.error('Error in error handler:', err);
    }
  }

  public async getModelStatus() {
    return await xgboostModel.getModelInfo();
  }
}

export const packetCapture = new PacketCaptureService();