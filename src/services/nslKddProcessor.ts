import Papa from 'papaparse';

export interface NSLKDDRecord {
  duration: number;
  protocol_type: string;
  service: string;
  flag: string;
  src_bytes: number;
  dst_bytes: number;
  land: number;
  wrong_fragment: number;
  urgent: number;
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
  count: number;
  srv_count: number;
  serror_rate: number;
  srv_serror_rate: number;
  rerror_rate: number;
  srv_rerror_rate: number;
  same_srv_rate: number;
  diff_srv_rate: number;
  srv_diff_host_rate: number;
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
  label: string;
}

export interface ProcessedDataset {
  features: number[][];
  labels: number[];
  featureNames: string[];
  labelEncoders: Record<string, Record<string, number>>;
  scaler: { mean: number[]; std: number[] };
  originalLabels: string[];
  stats: {
    totalSamples: number;
    normalCount: number;
    attackCount: number;
    attackTypes: Record<string, number>;
  };
}

export class NSLKDDProcessor {
  private columnNames = [
    "duration", "protocol_type", "service", "flag", "src_bytes", "dst_bytes", "land",
    "wrong_fragment", "urgent", "hot", "num_failed_logins", "logged_in", "num_compromised",
    "root_shell", "su_attempted", "num_root", "num_file_creations", "num_shells",
    "num_access_files", "num_outbound_cmds", "is_host_login", "is_guest_login",
    "count", "srv_count", "serror_rate", "srv_serror_rate", "rerror_rate", "srv_rerror_rate",
    "same_srv_rate", "diff_srv_rate", "srv_diff_host_rate", "dst_host_count",
    "dst_host_srv_count", "dst_host_same_srv_rate", "dst_host_diff_srv_rate",
    "dst_host_same_src_port_rate", "dst_host_srv_diff_host_rate", "dst_host_serror_rate",
    "dst_host_srv_serror_rate", "dst_host_rerror_rate", "dst_host_srv_rerror_rate", "label"
  ];

  private categoricalColumns = ["protocol_type", "service", "flag"];

  async processFile(file: File): Promise<ProcessedDataset> {
    const content = await this.readFile(file);
    return this.processDataset(content);
  }

  private readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  private async processDataset(content: string): Promise<ProcessedDataset> {
    // Parse CSV content
    const parseResult = Papa.parse(content, {
      header: false,
      skipEmptyLines: true,
      transform: (value: string, index: number) => {
        // Handle numeric columns
        if (index < this.columnNames.length - 1 && !this.categoricalColumns.includes(this.columnNames[index])) {
          const num = parseFloat(value);
          return isNaN(num) ? 0 : num;
        }
        return value.trim();
      }
    });

    const rawData = parseResult.data as any[][];
    console.log(`Parsed ${rawData.length} records from NSL-KDD dataset`);

    // Convert to structured records
    const records: NSLKDDRecord[] = rawData
      .filter(row => row.length >= this.columnNames.length)
      .map(row => {
        const record: any = {};
        this.columnNames.forEach((col, idx) => {
          record[col] = row[idx];
        });
        return record as NSLKDDRecord;
      });

    console.log(`Converted ${records.length} valid records`);

    // Label encoding for categorical columns
    const labelEncoders: Record<string, Record<string, number>> = {};
    
    for (const col of this.categoricalColumns) {
      const uniqueValues = [...new Set(records.map(r => (r as any)[col]))];
      labelEncoders[col] = {};
      uniqueValues.forEach((value, idx) => {
        labelEncoders[col][value] = idx;
      });
    }

    // Convert labels to binary (0 = normal, 1 = attack)
    const originalLabels = records.map(r => r.label);
    const binaryLabels = records.map(r => r.label === 'normal' ? 0 : 1);

    // Count attack types
    const attackTypes: Record<string, number> = {};
    originalLabels.forEach(label => {
      if (label !== 'normal') {
        attackTypes[label] = (attackTypes[label] || 0) + 1;
      }
    });

    // Extract and encode features
    const features: number[][] = records.map(record => {
      const feature: number[] = [];
      
      // Add numerical features
      const numericalCols = this.columnNames.slice(0, -1).filter(col => !this.categoricalColumns.includes(col));
      for (const col of numericalCols) {
        feature.push((record as any)[col] || 0);
      }
      
      // Add encoded categorical features
      for (const col of this.categoricalColumns) {
        const value = (record as any)[col];
        feature.push(labelEncoders[col][value] || 0);
      }
      
      return feature;
    });

    // Create feature names
    const numericalFeatureNames = this.columnNames.slice(0, -1).filter(col => !this.categoricalColumns.includes(col));
    const featureNames = [...numericalFeatureNames, ...this.categoricalColumns];

    // Calculate scaler (StandardScaler equivalent)
    const scaler = this.calculateScaler(features);

    // Apply scaling
    const scaledFeatures = features.map(row => 
      row.map((value, idx) => (value - scaler.mean[idx]) / scaler.std[idx])
    );

    // Statistics
    const stats = {
      totalSamples: records.length,
      normalCount: binaryLabels.filter(l => l === 0).length,
      attackCount: binaryLabels.filter(l => l === 1).length,
      attackTypes
    };

    console.log('Dataset statistics:', stats);

    return {
      features: scaledFeatures,
      labels: binaryLabels,
      featureNames,
      labelEncoders,
      scaler,
      originalLabels,
      stats
    };
  }

  private calculateScaler(features: number[][]): { mean: number[]; std: number[] } {
    const numFeatures = features[0].length;
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
      std[i] = Math.sqrt(variance) || 1;
    }

    return { mean, std };
  }

  // Apply SMOTE-like oversampling
  applySMOTE(dataset: ProcessedDataset, ratio: number = 1.0): ProcessedDataset {
    const { features, labels } = dataset;
    
    // Separate minority and majority classes
    const minorityIndices: number[] = [];
    const majorityIndices: number[] = [];
    
    labels.forEach((label, idx) => {
      if (label === 1) minorityIndices.push(idx);
      else majorityIndices.push(idx);
    });

    const minoritySize = minorityIndices.length;
    const majoritySize = majorityIndices.length;
    const targetMinoritySize = Math.floor(majoritySize * ratio);
    const samplesNeeded = Math.max(0, targetMinoritySize - minoritySize);

    console.log(`SMOTE: Generating ${samplesNeeded} synthetic samples`);

    const balancedFeatures = [...features];
    const balancedLabels = [...labels];

    // Generate synthetic samples
    for (let i = 0; i < samplesNeeded; i++) {
      // Pick a random minority sample
      const randomIdx = minorityIndices[Math.floor(Math.random() * minorityIndices.length)];
      const baseSample = features[randomIdx];
      
      // Find k nearest neighbors (simplified: just pick another random minority sample)
      const neighborIdx = minorityIndices[Math.floor(Math.random() * minorityIndices.length)];
      const neighbor = features[neighborIdx];
      
      // Generate synthetic sample
      const syntheticSample = baseSample.map((value, featureIdx) => {
        const diff = neighbor[featureIdx] - value;
        const randomFactor = Math.random();
        return value + randomFactor * diff;
      });
      
      balancedFeatures.push(syntheticSample);
      balancedLabels.push(1);
    }

    // Update statistics
    const newStats = {
      ...dataset.stats,
      totalSamples: balancedFeatures.length,
      attackCount: balancedLabels.filter(l => l === 1).length
    };

    console.log('After SMOTE:', newStats);

    return {
      ...dataset,
      features: balancedFeatures,
      labels: balancedLabels,
      stats: newStats
    };
  }

  // Split dataset for training/testing
  trainTestSplit(dataset: ProcessedDataset, testSize: number = 0.2): {
    trainFeatures: number[][], trainLabels: number[],
    testFeatures: number[][], testLabels: number[]
  } {
    const { features, labels } = dataset;
    const totalSamples = features.length;
    const testSamples = Math.floor(totalSamples * testSize);
    
    // Create indices and shuffle
    const indices = Array.from({ length: totalSamples }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    
    const testIndices = indices.slice(0, testSamples);
    const trainIndices = indices.slice(testSamples);
    
    return {
      trainFeatures: trainIndices.map(i => features[i]),
      trainLabels: trainIndices.map(i => labels[i]),
      testFeatures: testIndices.map(i => features[i]),
      testLabels: testIndices.map(i => labels[i])
    };
  }
}

export const nslKddProcessor = new NSLKDDProcessor();