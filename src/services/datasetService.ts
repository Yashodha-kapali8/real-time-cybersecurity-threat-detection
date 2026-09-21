import Papa from 'papaparse';

export interface NSLKDDFeatures {
  // Basic features
  duration: number;
  protocol_type: string;
  service: string;
  flag: string;
  src_bytes: number;
  dst_bytes: number;
  land: number;
  wrong_fragment: number;
  urgent: number;
  
  // Content features
  hot: number;
  num_failed_logins: number;
  logged_in: number;
  num_compromised: number;
  root_shell: number;
  su_attempted: number;
  num_root: number;
  num_file_creations: number;
  num_shells: number;
  num_access_files: number;
  num_outbound_cmds: number;
  is_host_login: number;
  is_guest_login: number;
  
  // Traffic features
  count: number;
  srv_count: number;
  serror_rate: number;
  srv_serror_rate: number;
  rerror_rate: number;
  srv_rerror_rate: number;
  same_srv_rate: number;
  diff_srv_rate: number;
  srv_diff_host_rate: number;
  
  // Host features
  dst_host_count: number;
  dst_host_srv_count: number;
  dst_host_same_srv_rate: number;
  dst_host_diff_srv_rate: number;
  dst_host_same_src_port_rate: number;
  dst_host_srv_diff_host_rate: number;
  dst_host_serror_rate: number;
  dst_host_srv_serror_rate: number;
  dst_host_rerror_rate: number;
  dst_host_srv_rerror_rate: number;
  
  // Label
  label?: string;
  is_attack?: number; // Binary: 0 = Normal, 1 = Attack
}

export interface PreprocessedDataset {
  features: number[][];
  labels: number[];
  featureNames: string[];
  attackTypes: string[];
  normalCount: number;
  attackCount: number;
}

export class DatasetService {
  private featureNames = [
    'duration', 'src_bytes', 'dst_bytes', 'land', 'wrong_fragment', 'urgent',
    'hot', 'num_failed_logins', 'logged_in', 'num_compromised', 'root_shell',
    'su_attempted', 'num_root', 'num_file_creations', 'num_shells', 'num_access_files',
    'num_outbound_cmds', 'is_host_login', 'is_guest_login', 'count', 'srv_count',
    'serror_rate', 'srv_serror_rate', 'rerror_rate', 'srv_rerror_rate',
    'same_srv_rate', 'diff_srv_rate', 'srv_diff_host_rate', 'dst_host_count',
    'dst_host_srv_count', 'dst_host_same_srv_rate', 'dst_host_diff_srv_rate',
    'dst_host_same_src_port_rate', 'dst_host_srv_diff_host_rate',
    'dst_host_serror_rate', 'dst_host_srv_serror_rate', 'dst_host_rerror_rate',
    'dst_host_srv_rerror_rate',
    // One-hot encoded categorical features
    'protocol_tcp', 'protocol_udp', 'protocol_icmp',
    'service_http', 'service_ssh', 'service_ftp', 'service_smtp', 'service_dns',
    'flag_sf', 'flag_s0', 'flag_rej', 'flag_rstr', 'flag_sh'
  ];

  private attackTypes = ['dos', 'probe', 'r2l', 'u2r'];

  // Generate synthetic NSL-KDD-like data for training
  generateSyntheticDataset(samples: number = 10000): PreprocessedDataset {
    const features: number[][] = [];
    const labels: number[] = [];
    const attackTypes: string[] = [];
    let normalCount = 0;
    let attackCount = 0;

    for (let i = 0; i < samples; i++) {
      const isAttack = Math.random() > 0.6; // 40% normal, 60% attack
      const sample = this.generateSyntheticSample(isAttack);
      
      features.push(sample.features);
      labels.push(sample.label);
      
      if (sample.label === 0) {
        normalCount++;
        attackTypes.push('normal');
      } else {
        attackCount++;
        attackTypes.push(sample.attackType);
      }
    }

    return {
      features,
      labels,
      featureNames: this.featureNames,
      attackTypes,
      normalCount,
      attackCount
    };
  }

  private generateSyntheticSample(isAttack: boolean): { features: number[]; label: number; attackType: string } {
    const features = new Array(this.featureNames.length).fill(0);
    
    if (isAttack) {
      const attackType = this.attackTypes[Math.floor(Math.random() * this.attackTypes.length)];
      
      switch (attackType) {
        case 'dos':
          // DoS attacks: high packet counts, large bytes
          features[0] = Math.random() * 100; // duration
          features[1] = Math.random() * 10000 + 5000; // src_bytes
          features[2] = Math.random() * 1000; // dst_bytes
          features[19] = Math.random() * 500 + 100; // count
          features[20] = Math.random() * 500 + 100; // srv_count
          features[40] = 1; // protocol_tcp
          features[44] = 1; // service_http
          break;
          
        case 'probe':
          // Probe attacks: scanning patterns
          features[0] = Math.random() * 10; // short duration
          features[1] = Math.random() * 100; // small src_bytes
          features[2] = Math.random() * 100; // small dst_bytes
          features[19] = Math.random() * 50 + 10; // moderate count
          features[29] = Math.random() * 100 + 50; // dst_host_count
          features[42] = 1; // protocol_icmp
          break;
          
        case 'r2l':
          // Remote to Local attacks: authentication attempts
          features[7] = Math.random() * 10 + 1; // num_failed_logins
          features[8] = 0; // not logged_in
          features[17] = 1; // is_guest_login
          features[40] = 1; // protocol_tcp
          features[45] = 1; // service_ssh
          break;
          
        case 'u2r':
          // User to Root attacks: privilege escalation
          features[9] = Math.random() * 5 + 1; // num_compromised
          features[10] = 1; // root_shell
          features[12] = Math.random() * 3 + 1; // num_root
          features[40] = 1; // protocol_tcp
          break;
      }
      
      return { features, label: 1, attackType };
    } else {
      // Normal traffic patterns
      features[0] = Math.random() * 50; // normal duration
      features[1] = Math.random() * 1000; // normal src_bytes
      features[2] = Math.random() * 1000; // normal dst_bytes
      features[8] = 1; // logged_in
      features[19] = Math.random() * 10 + 1; // normal count
      features[40] = Math.random() > 0.5 ? 1 : 0; // protocol_tcp
      features[41] = Math.random() > 0.8 ? 1 : 0; // protocol_udp
      features[44] = Math.random() > 0.7 ? 1 : 0; // service_http
      
      return { features, label: 0, attackType: 'normal' };
    }
  }

  // Parse CSV data (for actual NSL-KDD datasets)
  async parseCSV(csvContent: string): Promise<PreprocessedDataset> {
    return new Promise((resolve, reject) => {
      Papa.parse(csvContent, {
        header: false,
        complete: (results) => {
          try {
            const processedData = this.preprocessCSVData(results.data as string[][]);
            resolve(processedData);
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => reject(error)
      });
    });
  }

  private preprocessCSVData(rawData: string[][]): PreprocessedDataset {
    const features: number[][] = [];
    const labels: number[] = [];
    const attackTypes: string[] = [];
    let normalCount = 0;
    let attackCount = 0;

    for (const row of rawData) {
      if (row.length < 42) continue; // Skip incomplete rows
      
      const processedRow = this.preprocessRow(row);
      if (processedRow) {
        features.push(processedRow.features);
        labels.push(processedRow.label);
        
        if (processedRow.label === 0) {
          normalCount++;
          attackTypes.push('normal');
        } else {
          attackCount++;
          attackTypes.push(processedRow.attackType);
        }
      }
    }

    return {
      features,
      labels,
      featureNames: this.featureNames,
      attackTypes,
      normalCount,
      attackCount
    };
  }

  private preprocessRow(row: string[]): { features: number[]; label: number; attackType: string } | null {
    try {
      const features = new Array(this.featureNames.length).fill(0);
      
      // Basic numerical features
      features[0] = parseFloat(row[0]) || 0; // duration
      features[1] = parseFloat(row[4]) || 0; // src_bytes
      features[2] = parseFloat(row[5]) || 0; // dst_bytes
      
      // One-hot encode categorical features
      const protocol = row[1].toLowerCase();
      if (protocol === 'tcp') features[40] = 1;
      else if (protocol === 'udp') features[41] = 1;
      else if (protocol === 'icmp') features[42] = 1;
      
      const service = row[2].toLowerCase();
      if (service === 'http') features[43] = 1;
      else if (service === 'ssh') features[44] = 1;
      else if (service === 'ftp') features[45] = 1;
      
      // Label processing
      const label = row[row.length - 1].toLowerCase().trim();
      const isAttack = label !== 'normal';
      const attackType = isAttack ? this.mapAttackType(label) : 'normal';
      
      return {
        features,
        label: isAttack ? 1 : 0,
        attackType
      };
    } catch (error) {
      console.error('Error processing row:', error);
      return null;
    }
  }

  private mapAttackType(label: string): string {
    const dosAttacks = ['back', 'land', 'neptune', 'pod', 'smurf', 'teardrop'];
    const probeAttacks = ['ipsweep', 'nmap', 'portsweep', 'satan'];
    const r2lAttacks = ['ftp_write', 'guess_passwd', 'imap', 'multihop', 'phf', 'spy', 'warezclient', 'warezmaster'];
    const u2rAttacks = ['buffer_overflow', 'loadmodule', 'perl', 'rootkit'];
    
    if (dosAttacks.includes(label)) return 'dos';
    if (probeAttacks.includes(label)) return 'probe';
    if (r2lAttacks.includes(label)) return 'r2l';
    if (u2rAttacks.includes(label)) return 'u2r';
    
    return 'unknown';
  }

  // SMOTE-like oversampling simulation
  applySMOTE(dataset: PreprocessedDataset): PreprocessedDataset {
    const { features, labels, attackTypes } = dataset;
    const balancedFeatures: number[][] = [];
    const balancedLabels: number[] = [];
    const balancedAttackTypes: string[] = [];
    
    // Find minority and majority classes
    const normalIndices = labels.map((label, idx) => label === 0 ? idx : -1).filter(idx => idx !== -1);
    const attackIndices = labels.map((label, idx) => label === 1 ? idx : -1).filter(idx => idx !== -1);
    
    const majoritySize = Math.max(normalIndices.length, attackIndices.length);
    
    // Add all original samples
    features.forEach((feature, idx) => {
      balancedFeatures.push(feature);
      balancedLabels.push(labels[idx]);
      balancedAttackTypes.push(attackTypes[idx]);
    });
    
    // Oversample minority class
    const minorityIndices = normalIndices.length < attackIndices.length ? normalIndices : attackIndices;
    const samplesNeeded = majoritySize - minorityIndices.length;
    
    for (let i = 0; i < samplesNeeded; i++) {
      const randomIdx = minorityIndices[Math.floor(Math.random() * minorityIndices.length)];
      const syntheticSample = this.generateSyntheticNeighbor(features[randomIdx]);
      
      balancedFeatures.push(syntheticSample);
      balancedLabels.push(labels[randomIdx]);
      balancedAttackTypes.push(attackTypes[randomIdx]);
    }
    
    return {
      ...dataset,
      features: balancedFeatures,
      labels: balancedLabels,
      attackTypes: balancedAttackTypes,
      normalCount: balancedLabels.filter(l => l === 0).length,
      attackCount: balancedLabels.filter(l => l === 1).length
    };
  }

  private generateSyntheticNeighbor(original: number[]): number[] {
    return original.map(value => {
      // Add small random noise
      const noise = (Math.random() - 0.5) * 0.1 * value;
      return Math.max(0, value + noise);
    });
  }

  // Feature scaling (StandardScaler equivalent)
  scaleFeatures(dataset: PreprocessedDataset): { dataset: PreprocessedDataset; scaler: { mean: number[]; std: number[] } } {
    const { features } = dataset;
    const numFeatures = features[0].length;
    
    // Calculate mean and std for each feature
    const mean = new Array(numFeatures).fill(0);
    const std = new Array(numFeatures).fill(1);
    
    // Calculate means
    for (let i = 0; i < numFeatures; i++) {
      const values = features.map(row => row[i]);
      mean[i] = values.reduce((sum, val) => sum + val, 0) / values.length;
    }
    
    // Calculate standard deviations
    for (let i = 0; i < numFeatures; i++) {
      const values = features.map(row => row[i]);
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean[i], 2), 0) / values.length;
      std[i] = Math.sqrt(variance) || 1; // Avoid division by zero
    }
    
    // Scale features
    const scaledFeatures = features.map(row =>
      row.map((value, i) => (value - mean[i]) / std[i])
    );
    
    return {
      dataset: { ...dataset, features: scaledFeatures },
      scaler: { mean, std }
    };
  }

  // Apply scaler to new data
  applyScaler(features: number[], scaler: { mean: number[]; std: number[] }): number[] {
    return features.map((value, i) => (value - scaler.mean[i]) / scaler.std[i]);
  }
}

export const datasetService = new DatasetService();