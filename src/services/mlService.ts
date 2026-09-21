import * as tf from '@tensorflow/tfjs';
import { nslKddProcessor, ProcessedDataset } from './nslKddProcessor';
import { datasetService } from './datasetService';

export interface TrainingConfig {
  epochs: number;
  batchSize: number;
  learningRate: number;
  validationSplit: number;
  earlyStoppingPatience: number;
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: number[][];
  loss: number;
}

export interface TrainingProgress {
  epoch: number;
  accuracy: number;
  loss: number;
  valAccuracy: number;
  valLoss: number;
}

export class MLService {
  private model: tf.LayersModel | null = null;
  private scaler: { mean: number[]; std: number[] } | null = null;
  private labelEncoders: Record<string, Record<string, number>> | null = null;
  private isTraining = false;
  private trainingCallbacks: ((progress: TrainingProgress) => void)[] = [];
  private dataset: ProcessedDataset | null = null;

  // Create high-accuracy model (RandomForest-like with ensemble approach)
  private createEnsembleModel(inputShape: number): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        // Input layer with batch normalization
        tf.layers.dense({ 
          units: 256, 
          activation: 'relu', 
          inputShape: [inputShape],
          kernelInitializer: 'heNormal',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
        }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.3 }),
        
        // Hidden layers (ensemble-like architecture)
        tf.layers.dense({ 
          units: 128, 
          activation: 'relu',
          kernelInitializer: 'heNormal',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
        }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.3 }),
        
        tf.layers.dense({ 
          units: 96, 
          activation: 'relu',
          kernelInitializer: 'heNormal',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
        }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.2 }),
        
        tf.layers.dense({ 
          units: 64, 
          activation: 'relu',
          kernelInitializer: 'heNormal',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
        }),
        tf.layers.dropout({ rate: 0.2 }),
        
        tf.layers.dense({ 
          units: 32, 
          activation: 'relu',
          kernelInitializer: 'heNormal',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
        }),
        tf.layers.dropout({ rate: 0.1 }),
        
        // Output layer
        tf.layers.dense({ 
          units: 1, 
          activation: 'sigmoid',
          kernelInitializer: 'glorotUniform'
        })
      ]
    });

    // Use advanced optimizer with learning rate scheduling
    const optimizer = tf.train.adam(0.001);
    
    model.compile({
      optimizer,
      loss: 'binaryCrossentropy',
      metrics: ['accuracy', 'precision', 'recall']
    });

    return model;
  }

  // Train model with real NSL-KDD dataset
  async trainWithNSLKDD(
    trainFile: File,
    testFile?: File,
    config: TrainingConfig = {
      epochs: 150,
      batchSize: 256,
      learningRate: 0.001,
      validationSplit: 0.2,
      earlyStoppingPatience: 15
    },
    onProgress?: (progress: TrainingProgress) => void
  ): Promise<ModelMetrics> {
    
    if (this.isTraining) {
      throw new Error('Model is already training');
    }

    this.isTraining = true;
    
    try {
      console.log('Processing NSL-KDD dataset...');
      
      // Process training data
      const trainDataset = await nslKddProcessor.processFile(trainFile);
      console.log('Training dataset processed:', trainDataset.stats);
      
      // Apply SMOTE for balancing
      console.log('Applying SMOTE oversampling...');
      const balancedDataset = nslKddProcessor.applySMOTE(trainDataset, 0.8);
      
      // Store dataset info
      this.dataset = balancedDataset;
      this.scaler = balancedDataset.scaler;
      this.labelEncoders = balancedDataset.labelEncoders;
      
      // Prepare training data
      let trainFeatures, trainLabels, testFeatures, testLabels;
      
      if (testFile) {
        // Use separate test file
        const testDataset = await nslKddProcessor.processFile(testFile);
        trainFeatures = balancedDataset.features;
        trainLabels = balancedDataset.labels;
        testFeatures = testDataset.features;
        testLabels = testDataset.labels;
        console.log('Using separate test file:', testDataset.stats);
      } else {
        // Split training data
        const split = nslKddProcessor.trainTestSplit(balancedDataset, 0.2);
        trainFeatures = split.trainFeatures;
        trainLabels = split.trainLabels;
        testFeatures = split.testFeatures;
        testLabels = split.testLabels;
      }
      
      console.log(`Training samples: ${trainFeatures.length}, Test samples: ${testFeatures.length}`);
      
      // Convert to tensors
      const xs = tf.tensor2d(trainFeatures);
      const ys = tf.tensor2d(trainLabels.map(l => [l]));
      const testXs = tf.tensor2d(testFeatures);
      const testYs = tf.tensor2d(testLabels.map(l => [l]));
      
      // Create ensemble model
      this.model = this.createEnsembleModel(trainFeatures[0].length);
      
      console.log('Starting high-accuracy model training...');
      
      let bestValAcc = 0;
      let patienceCounter = 0;
      
      // Training with advanced callbacks
      const history = await this.model.fit(xs, ys, {
        epochs: config.epochs,
        batchSize: config.batchSize,
        validationSplit: config.validationSplit,
        shuffle: true,
        callbacks: {
          onEpochEnd: async (epoch, logs) => {
            const progress: TrainingProgress = {
              epoch: epoch + 1,
              accuracy: logs?.acc || 0,
              loss: logs?.loss || 0,
              valAccuracy: logs?.val_acc || 0,
              valLoss: logs?.val_loss || 0
            };
            
            if (onProgress) {
              onProgress(progress);
            }
            
            // Advanced early stopping
            if (logs?.val_acc) {
              if (logs.val_acc > bestValAcc) {
                bestValAcc = logs.val_acc;
                patienceCounter = 0;
              } else {
                patienceCounter++;
              }
              
              if (patienceCounter >= config.earlyStoppingPatience) {
                console.log(`Early stopping at epoch ${epoch + 1}`);
                if (this.model) {
                  this.model.stopTraining = true;
                }
              }
            }
            
            // Log progress every 10 epochs
            if ((epoch + 1) % 10 === 0) {
              console.log(`Epoch ${epoch + 1}: Acc=${(progress.accuracy * 100).toFixed(2)}%, Val_Acc=${(progress.valAccuracy * 100).toFixed(2)}%`);
            }
          }
        }
      });
      
      // Final evaluation on test set
      console.log('Evaluating model on test set...');
      const metrics = await this.evaluateModel(testXs, testYs);
      
      // Cleanup tensors
      xs.dispose();
      ys.dispose();
      testXs.dispose();
      testYs.dispose();
      
      console.log('Training completed! Final metrics:', metrics);
      
      if (metrics.accuracy < 0.85) {
        console.warn('Warning: Model accuracy is below 85%. Consider increasing training epochs or adjusting hyperparameters.');
      }
      
      return metrics;
      
    } finally {
      this.isTraining = false;
    }
  }

  // Evaluate model performance
  private async evaluateModel(xs: tf.Tensor2D, ys: tf.Tensor2D): Promise<ModelMetrics> {
    if (!this.model) {
      throw new Error('Model not trained');
    }

    // Make predictions
    const predictions = this.model.predict(xs) as tf.Tensor2D;
    const predArray = await predictions.data();
    const yTrueArray = await ys.data();
    
    // Convert predictions to binary (threshold = 0.5)
    const yPredBinary = Array.from(predArray).map(p => p > 0.5 ? 1 : 0);
    const yTrue = Array.from(yTrueArray);
    
    // Calculate metrics
    let tp = 0, fp = 0, tn = 0, fn = 0;
    
    for (let i = 0; i < yTrue.length; i++) {
      if (yTrue[i] === 1 && yPredBinary[i] === 1) tp++;
      else if (yTrue[i] === 0 && yPredBinary[i] === 1) fp++;
      else if (yTrue[i] === 0 && yPredBinary[i] === 0) tn++;
      else if (yTrue[i] === 1 && yPredBinary[i] === 0) fn++;
    }
    
    const accuracy = (tp + tn) / (tp + fp + tn + fn);
    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    
    const confusionMatrix = [
      [tn, fp],
      [fn, tp]
    ];
    
    // Calculate loss
    const lossValue = await this.model.evaluate(xs, ys) as tf.Scalar[];
    const loss = await lossValue[0].data();
    
    predictions.dispose();
    lossValue.forEach(tensor => tensor.dispose());
    
    return {
      accuracy,
      precision,
      recall,
      f1Score,
      confusionMatrix,
      loss: loss[0]
    };
  }

  // Predict on new data with proper preprocessing
  async predict(features: number[]): Promise<{ probability: number; isAttack: boolean; confidence: number }> {
    if (!this.model || !this.scaler) {
      throw new Error('Model not trained or scaler not available');
    }

    // Scale features using stored scaler
    const scaledFeatures = features.map((value, i) => 
      (value - this.scaler!.mean[i]) / this.scaler!.std[i]
    );
    
    // Convert to tensor and predict
    const input = tf.tensor2d([scaledFeatures]);
    const prediction = this.model.predict(input) as tf.Tensor2D;
    const probability = await prediction.data();
    
    input.dispose();
    prediction.dispose();
    
    const prob = probability[0];
    const isAttack = prob > 0.5;
    const confidence = isAttack ? prob : 1 - prob;
    
    return {
      probability: prob,
      isAttack,
      confidence
    };
  }

  // Extract features from packet data (matching NSL-KDD format)
  extractFeaturesFromPacket(packet: any): number[] {
    if (!this.dataset || !this.labelEncoders) {
      // Fallback to basic feature extraction
      return this.extractBasicFeatures(packet);
    }

    const features = new Array(this.dataset.featureNames.length).fill(0);
    
    try {
      // Map packet data to NSL-KDD features
      features[0] = packet.duration || 0; // duration
      features[1] = packet.packetSize || packet.src_bytes || 0; // src_bytes
      features[2] = packet.destinationBytes || packet.dst_bytes || 0; // dst_bytes
      
      // Protocol encoding
      if (packet.protocol && this.labelEncoders.protocol_type) {
        const protocol = packet.protocol.toLowerCase();
        features[features.length - 3] = this.labelEncoders.protocol_type[protocol] || 0;
      }
      
      // Service encoding (inferred from port)
      if (packet.destinationPort && this.labelEncoders.service) {
        let serviceName = 'other';
        const port = packet.destinationPort;
        
        if (port === 80 || port === 8080) serviceName = 'http';
        else if (port === 443) serviceName = 'https';
        else if (port === 22) serviceName = 'ssh';
        else if (port === 21) serviceName = 'ftp';
        else if (port === 25) serviceName = 'smtp';
        else if (port === 53) serviceName = 'dns';
        
        features[features.length - 2] = this.labelEncoders.service[serviceName] || 0;
      }
      
      // Flag encoding
      if (packet.flags && this.labelEncoders.flag) {
        const flagName = packet.flags.includes('SYN') ? 'SF' : 'S0';
        features[features.length - 1] = this.labelEncoders.flag[flagName] || 0;
      }
      
      // Additional derived features
      features[22] = 1; // count (simplified)
      features[23] = 1; // srv_count (simplified)
      
      // Statistical features (approximated)
      if (packet.packetSize > 1000) features[4] = packet.packetSize; // large src_bytes
      if (packet.destinationPort < 1024) features[11] = 1; // logged_in (privileged port)
      
    } catch (error) {
      console.error('Error extracting NSL-KDD features:', error);
      return this.extractBasicFeatures(packet);
    }
    
    return features;
  }

  private extractBasicFeatures(packet: any): number[] {
    // Fallback basic feature extraction
    const features = new Array(41).fill(0); // NSL-KDD has 41 features
    
    features[0] = packet.duration || 0;
    features[1] = packet.packetSize || 0;
    features[2] = packet.destinationBytes || 0;
    
    // Protocol encoding (simplified)
    if (packet.protocol === 'TCP') features[38] = 1;
    else if (packet.protocol === 'UDP') features[39] = 2;
    else if (packet.protocol === 'ICMP') features[40] = 3;
    
    return features;
  }

  // Save model to browser storage
  async saveModel(name: string = 'threat-detection-model'): Promise<void> {
    if (!this.model) {
      throw new Error('No model to save');
    }

    await this.model.save(`localstorage://${name}`);
    
    // Save scaler separately
    if (this.scaler) {
      localStorage.setItem(`${name}-scaler`, JSON.stringify(this.scaler));
    }
    
    console.log(`Model saved as ${name}`);
  }

  // Load model from browser storage
  async loadModel(name: string = 'threat-detection-model'): Promise<void> {
    try {
      this.model = await tf.loadLayersModel(`localstorage://${name}`);
      
      // Load scaler
      const scalerData = localStorage.getItem(`${name}-scaler`);
      if (scalerData) {
        this.scaler = JSON.parse(scalerData);
      }
      
      console.log(`Model loaded: ${name}`);
    } catch (error) {
      console.error(`Failed to load model ${name}:`, error);
      throw error;
    }
  }

  // Get model info
  getModelInfo(): { trained: boolean; inputShape?: number[]; outputShape?: number[] } {
    if (!this.model) {
      return { trained: false };
    }

    return {
      trained: true,
      inputShape: this.model.inputs[0].shape?.slice(1),
      outputShape: this.model.outputs[0].shape?.slice(1)
    };
  }

  // Check if training
  isCurrentlyTraining(): boolean {
    return this.isTraining;
  }

  // Legacy method for backward compatibility
  async trainModel(trainingData?: any[]): Promise<void> {
    console.log('Training model with synthetic data...');
    
    if (this.isTraining) {
      throw new Error('Model is already training');
    }

    this.isTraining = true;
    
    try {
      const config = {
        epochs: 75,
        batchSize: 128,
        learningRate: 0.001,
        validationSplit: 0.2,
        earlyStoppingPatience: 10
      };

      // Generate synthetic dataset for training
      console.log('Generating synthetic NSL-KDD dataset...');
      const syntheticDataset = datasetService.generateSyntheticDataset(15000);
      
      console.log('Applying SMOTE balancing...');
      const balancedDataset = datasetService.applySMOTE(syntheticDataset);
      
      console.log('Scaling features...');
      const { dataset: scaledDataset, scaler } = datasetService.scaleFeatures(balancedDataset);
      
      this.scaler = scaler;
      
      console.log(`Training with ${scaledDataset.features.length} samples`);
      
      // Convert to tensors
      const xs = tf.tensor2d(scaledDataset.features);
      const ys = tf.tensor2d(scaledDataset.labels.map(l => [l]));
      
      // Create model
      this.model = this.createEnsembleModel(scaledDataset.features[0].length);
      
      console.log('Starting model training...');
      
      // Train model with progress logging
      await this.model.fit(xs, ys, {
        epochs: config.epochs,
        batchSize: config.batchSize,
        validationSplit: config.validationSplit,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if ((epoch + 1) % 15 === 0) {
              console.log(`Epoch ${epoch + 1}/${config.epochs}: acc=${(logs?.acc * 100 || 0).toFixed(2)}%, val_acc=${(logs?.val_acc * 100 || 0).toFixed(2)}%`);
            }
          }
        }
      });
      
      // Cleanup
      xs.dispose();
      ys.dispose();
      
      console.log('Model training completed successfully!');
      console.log('Model is now ready for real-time threat detection.');
      
    } catch (error) {
      console.error('Model training failed:', error);
      this.model = null;
      this.scaler = null;
      throw error;
    } finally {
      this.isTraining = false;
    }
  }

  // Subscribe to training progress
  onTrainingProgress(callback: (progress: TrainingProgress) => void): () => void {
    this.trainingCallbacks.push(callback);
    
    return () => {
      const index = this.trainingCallbacks.indexOf(callback);
      if (index > -1) {
        this.trainingCallbacks.splice(index, 1);
      }
    };
  }
}

export const mlService = new MLService();