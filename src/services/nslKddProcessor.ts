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

type NSLKDDColumn = keyof NSLKDDRecord;
type RawCSVValue = string | number;
type RawCSVRow = RawCSVValue[];

const NSLKDD_COLUMNS: NSLKDDColumn[] = [
  'duration',
  'protocol_type',
  'service',
  'flag',
  'src_bytes',
  'dst_bytes',
  'land',
  'wrong_fragment',
  'urgent',
  'hot',
  'num_failed_logins',
  'logged_in',
  'num_compromised',
  'root_shell',
  'su_attempted',
  'num_root',
  'num_file_creations',
  'num_shells',
  'num_access_files',
  'num_outbound_cmds',
  'is_host_login',
  'is_guest_login',
  'count',
  'srv_count',
  'serror_rate',
  'srv_serror_rate',
  'rerror_rate',
  'srv_rerror_rate',
  'same_srv_rate',
  'diff_srv_rate',
  'srv_diff_host_rate',
  'dst_host_count',
  'dst_host_srv_count',
  'dst_host_same_srv_rate',
  'dst_host_diff_srv_rate',
  'dst_host_same_src_port_rate',
  'dst_host_srv_diff_host_rate',
  'dst_host_serror_rate',
  'dst_host_srv_serror_rate',
  'dst_host_rerror_rate',
  'dst_host_srv_rerror_rate',
  'label',
];

const CATEGORICAL_COLUMNS: NSLKDDColumn[] = [
  'protocol_type',
  'service',
  'flag',
];

const NUMERICAL_COLUMNS = NSLKDD_COLUMNS.filter(
  (column) => column !== 'label' && !CATEGORICAL_COLUMNS.includes(column),
);

export class NSLKDDProcessor {
  private readonly columnNames = NSLKDD_COLUMNS;

  private readonly categoricalColumns = CATEGORICAL_COLUMNS;

  async processFile(file: File): Promise<ProcessedDataset> {
    const content = await this.readFile(file);
    return this.processDataset(content);
  }

  private readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const result = event.target?.result;

        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Unable to read dataset as text.'));
        }
      };

      reader.onerror = () => {
        reject(reader.error ?? new Error('Failed to read dataset file.'));
      };

      reader.readAsText(file);
    });
  }

  private async processDataset(content: string): Promise<ProcessedDataset> {
    // Parse CSV content
    const parseResult = Papa.parse<RawCSVRow>(content, {
      header: false,
      skipEmptyLines: true,
      transform: (value: string, index: number) => {
        const column = this.columnNames[index];

        // Handle numeric columns
        if (
          index < this.columnNames.length - 1 &&
          column &&
          !this.categoricalColumns.includes(column)
        ) {
          const num = parseFloat(value);
          return Number.isNaN(num) ? 0 : num;
        }

        return value.trim();
      },
    });

    const rawData = parseResult.data;

    console.log(
      `Parsed ${rawData.length} records from NSL-KDD dataset`,
    );

    // Convert to structured records
    const records: NSLKDDRecord[] = rawData
      .filter((row) => row.length >= this.columnNames.length)
      .map((row) => this.createRecord(row));

    console.log(`Converted ${records.length} valid records`);

    // Label encoding for categorical columns
    const labelEncoders: Record<string, Record<string, number>> = {};

    for (const column of this.categoricalColumns) {
      const uniqueValues = [
        ...new Set(
          records.map((record) => String(record[column])),
        ),
      ];

      labelEncoders[column] = {};

      uniqueValues.forEach((value, index) => {
        labelEncoders[column][value] = index;
      });
    }

    // Convert labels to binary (0 = normal, 1 = attack)
    const originalLabels = records.map((record) => record.label);
    const binaryLabels = records.map((record) =>
      record.label === 'normal' ? 0 : 1,
    );

    // Count attack types
    const attackTypes: Record<string, number> = {};

    originalLabels.forEach((label) => {
      if (label !== 'normal') {
        attackTypes[label] = (attackTypes[label] || 0) + 1;
      }
    });

    // Extract and encode features
    const features: number[][] = records.map((record) => {
      const feature: number[] = [];

      // Add numerical features
      for (const column of NUMERICAL_COLUMNS) {
        const value = record[column];

        if (typeof value === 'number') {
          feature.push(value);
        } else {
          feature.push(0);
        }
      }

      // Add encoded categorical features
      for (const column of this.categoricalColumns) {
        const value = String(record[column]);
        feature.push(labelEncoders[column][value] ?? 0);
      }

      return feature;
    });

    // Create feature names
    const featureNames = [
      ...NUMERICAL_COLUMNS,
      ...this.categoricalColumns,
    ];

    // Calculate scaler (StandardScaler equivalent)
    const scaler = this.calculateScaler(features);

    // Apply scaling
    const scaledFeatures = features.map((row) =>
      row.map(
        (value, index) =>
          (value - scaler.mean[index]) / scaler.std[index],
      ),
    );

    // Statistics
    const stats = {
      totalSamples: records.length,
      normalCount: binaryLabels.filter((label) => label === 0).length,
      attackCount: binaryLabels.filter((label) => label === 1).length,
      attackTypes,
    };

    console.log('Dataset statistics:', stats);

    return {
      features: scaledFeatures,
      labels: binaryLabels,
      featureNames,
      labelEncoders,
      scaler,
      originalLabels,
      stats,
    };
  }

  private createRecord(row: RawCSVRow): NSLKDDRecord {
    const record = {} as NSLKDDRecord;

    this.columnNames.forEach((column, index) => {
      const value = row[index];

      if (column === 'label') {
        record[column] = String(value ?? '').trim();
      } else if (this.categoricalColumns.includes(column)) {
        record[column] = String(value ?? '').trim();
      } else {
        record[column] =
          typeof value === 'number'
            ? value
            : parseFloat(String(value ?? '')) || 0;
      }
    });

    return record;
  }

  private calculateScaler(
    features: number[][],
  ): { mean: number[]; std: number[] } {
    if (features.length === 0) {
      return {
        mean: [],
        std: [],
      };
    }

    const numFeatures = features[0].length;
    const mean = new Array<number>(numFeatures).fill(0);
    const std = new Array<number>(numFeatures).fill(1);

    // Calculate means
    for (let i = 0; i < numFeatures; i++) {
      const values = features.map((row) => row[i]);

      mean[i] =
        values.reduce((sum, value) => sum + value, 0) /
        values.length;
    }

    // Calculate standard deviations
    for (let i = 0; i < numFeatures; i++) {
      const values = features.map((row) => row[i]);

      const variance =
        values.reduce(
          (sum, value) =>
            sum + Math.pow(value - mean[i], 2),
          0,
        ) / values.length;

      std[i] = Math.sqrt(variance) || 1;
    }

    return { mean, std };
  }

  // Apply SMOTE-like oversampling
  applySMOTE(
    dataset: ProcessedDataset,
    ratio: number = 1.0,
  ): ProcessedDataset {
    const { features, labels } = dataset;

    // Separate minority and majority classes
    const minorityIndices: number[] = [];
    const majorityIndices: number[] = [];

    labels.forEach((label, index) => {
      if (label === 1) {
        minorityIndices.push(index);
      } else {
        majorityIndices.push(index);
      }
    });

    const minoritySize = minorityIndices.length;
    const majoritySize = majorityIndices.length;
    const targetMinoritySize = Math.floor(
      majoritySize * ratio,
    );
    const samplesNeeded = Math.max(
      0,
      targetMinoritySize - minoritySize,
    );

    console.log(
      `SMOTE: Generating ${samplesNeeded} synthetic samples`,
    );

    const balancedFeatures = [...features];
    const balancedLabels = [...labels];

    // Generate synthetic samples
    for (let i = 0; i < samplesNeeded; i++) {
      // Pick a random minority sample
      const randomIdx =
        minorityIndices[
          Math.floor(
            Math.random() * minorityIndices.length,
          )
        ];

      const baseSample = features[randomIdx];

      // Find k nearest neighbors (simplified: just pick another random minority sample)
      const neighborIdx =
        minorityIndices[
          Math.floor(
            Math.random() * minorityIndices.length,
          )
        ];

      const neighbor = features[neighborIdx];

      // Generate synthetic sample
      const syntheticSample = baseSample.map(
        (value, featureIndex) => {
          const diff = neighbor[featureIndex] - value;
          const randomFactor = Math.random();

          return value + randomFactor * diff;
        },
      );

      balancedFeatures.push(syntheticSample);
      balancedLabels.push(1);
    }

    // Update statistics
    const newStats = {
      ...dataset.stats,
      totalSamples: balancedFeatures.length,
      attackCount: balancedLabels.filter(
        (label) => label === 1,
      ).length,
    };

    console.log('After SMOTE:', newStats);

    return {
      ...dataset,
      features: balancedFeatures,
      labels: balancedLabels,
      stats: newStats,
    };
  }

  // Split dataset for training/testing
  trainTestSplit(
    dataset: ProcessedDataset,
    testSize: number = 0.2,
  ): {
    trainFeatures: number[][];
    trainLabels: number[];
    testFeatures: number[][];
    testLabels: number[];
  } {
    const { features, labels } = dataset;
    const totalSamples = features.length;
    const testSamples = Math.floor(
      totalSamples * testSize,
    );

    // Create indices and shuffle
    const indices = Array.from(
      { length: totalSamples },
      (_, index) => index,
    );

    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [
        indices[j],
        indices[i],
      ];
    }

    const testIndices = indices.slice(0, testSamples);
    const trainIndices = indices.slice(testSamples);

    return {
      trainFeatures: trainIndices.map(
        (index) => features[index],
      ),
      trainLabels: trainIndices.map(
        (index) => labels[index],
      ),
      testFeatures: testIndices.map(
        (index) => features[index],
      ),
      testLabels: testIndices.map(
        (index) => labels[index],
      ),
    };
  }
}

export const nslKddProcessor = new NSLKDDProcessor();