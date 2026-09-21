import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Alert, AlertDescription } from "./ui/alert";
import { Upload, FileText, Database, CheckCircle, AlertTriangle, Download } from "lucide-react";
import { useState, useRef } from "react";
import { useToast } from "../hooks/use-toast";
import { mlService } from "../services/mlService";
import { nslKddProcessor } from "../services/nslKddProcessor";

interface DatasetStats {
  totalSamples: number;
  normalCount: number;
  attackCount: number;
  attackTypes: Record<string, number>;
}

const DatasetUploader = ({ onTrainingComplete }: { onTrainingComplete?: (metrics: any) => void }) => {
  const { toast } = useToast();
  const [trainFile, setTrainFile] = useState<File | null>(null);
  const [testFile, setTestFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [datasetStats, setDatasetStats] = useState<DatasetStats | null>(null);
  const [modelMetrics, setModelMetrics] = useState<any>(null);
  
  const trainFileRef = useRef<HTMLInputElement>(null);
  const testFileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File, type: 'train' | 'test') => {
    if (type === 'train') {
      setTrainFile(file);
    } else {
      setTestFile(file);
    }

    // Process file to show stats
    setIsProcessing(true);
    try {
      const processed = await nslKddProcessor.processFile(file);
      setDatasetStats(processed.stats);
      
      toast({
        title: "Dataset Processed",
        description: `${type === 'train' ? 'Training' : 'Test'} file loaded: ${processed.stats.totalSamples.toLocaleString()} samples`,
      });
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Processing Error",
        description: "Failed to process dataset file. Please check the format.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTraining = async () => {
    if (!trainFile) {
      toast({
        title: "Missing Training Data",
        description: "Please upload the NSL-KDD training dataset first.",
        variant: "destructive"
      });
      return;
    }

    setIsTraining(true);
    setTrainingProgress(0);
    
    try {
      toast({
        title: "Training Started",
        description: "Training high-accuracy model with NSL-KDD dataset...",
      });

      const metrics = await mlService.trainWithNSLKDD(
        trainFile,
        testFile || undefined,
        {
          epochs: 100,
          batchSize: 256,
          learningRate: 0.001,
          validationSplit: 0.2,
          earlyStoppingPatience: 15
        },
        (progress) => {
          setTrainingProgress((progress.epoch / 100) * 100);
        }
      );

      setModelMetrics(metrics);
      await mlService.saveModel('nsl-kdd-model');
      
      toast({
        title: "Training Complete!",
        description: `Model achieved ${(metrics.accuracy * 100).toFixed(1)}% accuracy with ${(metrics.f1Score * 100).toFixed(1)}% F1-score`,
      });

      if (onTrainingComplete) {
        onTrainingComplete(metrics);
      }
      
    } catch (error) {
      console.error('Training error:', error);
      toast({
        title: "Training Failed",
        description: "An error occurred during training. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setIsTraining(false);
      setTrainingProgress(0);
    }
  };

  const downloadSampleData = () => {
    // Create sample NSL-KDD data
    const sampleData = [
      '0,tcp,http,SF,181,5450,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,8,8,0.00,0.00,0.00,0.00,1.00,0.00,0.00,9,9,1.00,0.00,0.11,0.00,0.00,0.00,0.00,0.00,normal',
      '0,tcp,http,SF,239,486,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,8,8,0.00,0.00,0.00,0.00,1.00,0.00,0.00,19,19,1.00,0.00,0.05,0.00,0.00,0.00,0.00,0.00,normal',
      '0,tcp,http,SF,235,1337,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,8,8,0.00,0.00,0.00,0.00,1.00,0.00,0.00,29,29,1.00,0.00,0.03,0.00,0.00,0.00,0.00,0.00,normal',
      '0,tcp,http,SF,219,1337,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,6,6,0.00,0.00,0.00,0.00,1.00,0.00,0.00,39,39,1.00,0.00,0.03,0.00,0.00,0.00,0.00,0.00,normal',
      '0,tcp,http,SF,217,2032,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,6,6,0.00,0.00,0.00,0.00,1.00,0.00,0.00,49,49,1.00,0.00,0.02,0.00,0.00,0.00,0.00,0.00,normal',
      '0,tcp,http,SF,217,2032,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,6,6,0.00,0.00,0.00,0.00,1.00,0.00,0.00,59,59,1.00,0.00,0.02,0.00,0.00,0.00,0.00,0.00,normal',
      '0,icmp,ecr_i,SF,1032,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,511,511,0.00,0.00,0.00,0.00,1.00,0.00,0.00,511,511,1.00,0.00,1.00,0.00,0.00,0.00,0.00,0.00,smurf',
      '0,tcp,private,REJ,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1.00,1.00,0.00,0.00,1.00,0.00,1.00,1,1,1.00,0.00,1.00,1.00,1.00,0.00,1.00,0.00,neptune'
    ].join('\n');
    
    const blob = new Blob([sampleData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_nsl_kdd.txt';
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Sample Data Downloaded",
      description: "Use this sample file to test the training process",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            NSL-KDD Dataset Training
          </CardTitle>
          <CardDescription>
            Upload real NSL-KDD dataset files for high-accuracy model training (90%+ expected)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-dashed">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <p className="font-medium">Training Dataset</p>
                    <p className="text-sm text-muted-foreground">KDDTrain+.txt</p>
                  </div>
                  <Button 
                    onClick={() => trainFileRef.current?.click()}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    {trainFile ? "Replace File" : "Select Training File"}
                  </Button>
                  <input
                    ref={trainFileRef}
                    type="file"
                    accept=".txt,.csv"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'train')}
                    className="hidden"
                  />
                  {trainFile && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {trainFile.name}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <p className="font-medium">Test Dataset (Optional)</p>
                    <p className="text-sm text-muted-foreground">KDDTest+.txt</p>
                  </div>
                  <Button 
                    onClick={() => testFileRef.current?.click()}
                    disabled={isProcessing}
                    variant="outline"
                    className="w-full"
                  >
                    {testFile ? "Replace File" : "Select Test File"}
                  </Button>
                  <input
                    ref={testFileRef}
                    type="file"
                    accept=".txt,.csv"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'test')}
                    className="hidden"
                  />
                  {testFile && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {testFile.name}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sample Data Download */}
          <Alert>
            <Download className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Don't have NSL-KDD dataset? Download our sample data to test the training process.</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={downloadSampleData}
                className="ml-4"
              >
                <Download className="h-4 w-4 mr-2" />
                Sample Data
              </Button>
            </AlertDescription>
          </Alert>

          {/* Dataset Statistics */}
          {datasetStats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dataset Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {datasetStats.totalSamples.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground">Total Samples</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {datasetStats.normalCount.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground">Normal Traffic</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {datasetStats.attackCount.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground">Attack Samples</p>
                  </div>
                </div>
                
                {Object.keys(datasetStats.attackTypes).length > 0 && (
                  <div className="mt-4">
                    <p className="font-medium mb-2">Attack Types:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(datasetStats.attackTypes).map(([type, count]) => (
                        <Badge key={type} variant="outline">
                          {type}: {count.toLocaleString()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Training Section */}
          <div className="space-y-4">
            <Button 
              onClick={handleTraining}
              disabled={!trainFile || isTraining || isProcessing}
              className="w-full"
              size="lg"
            >
              {isTraining ? "Training in Progress..." : "Train High-Accuracy Model"}
            </Button>

            {isTraining && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Training Progress</span>
                  <span className="text-sm font-medium">{Math.round(trainingProgress)}%</span>
                </div>
                <Progress value={trainingProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Processing NSL-KDD dataset with SMOTE balancing and ensemble training...
                </p>
              </div>
            )}
          </div>

          {/* Results */}
          {modelMetrics && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  Training Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {(modelMetrics.accuracy * 100).toFixed(1)}%
                    </div>
                    <p className="text-sm text-muted-foreground">Accuracy</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {(modelMetrics.precision * 100).toFixed(1)}%
                    </div>
                    <p className="text-sm text-muted-foreground">Precision</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {(modelMetrics.recall * 100).toFixed(1)}%
                    </div>
                    <p className="text-sm text-muted-foreference">Recall</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {(modelMetrics.f1Score * 100).toFixed(1)}%
                    </div>
                    <p className="text-sm text-muted-foreground">F1-Score</p>
                  </div>
                </div>
                
                {modelMetrics.accuracy >= 0.9 ? (
                  <Alert className="mt-4 border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Excellent! Model achieved 90%+ accuracy. Ready for real-time threat detection.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="mt-4 border-yellow-200 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      Consider increasing training epochs or adjusting hyperparameters for better accuracy.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DatasetUploader;