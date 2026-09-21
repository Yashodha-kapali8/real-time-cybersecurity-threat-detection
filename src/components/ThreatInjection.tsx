import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { xgboostModel } from '@/services/xgboostModelLoader';
import { threatService } from '@/services/threatService';
import { supabase } from '@/integrations/supabase/client';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { parseKddRow, KDD_COLUMNS } from '@/lib/kdd';

export default function ThreatInjection() {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Normal';
    confidence: number;
    threatType: string;
    description: string;
  } | null>(null);

  const [csvAnalysis, setCsvAnalysis] = useState<null | {
    total: number;
    counts: Record<string, number>;
    rows: Array<{ originalLabel: string; attackType: string; severity: string }>;
  }>(null);

  const [formData, setFormData] = useState({
    sourceIP: '',
    destinationIP: '',
    protocol: 'TCP',
    sourcePort: '',
    destinationPort: '',
    packetSize: '',
    flags: ''
  });

  const handleAnalyze = async () => {
    // Validate inputs
    if (!formData.sourceIP || !formData.destinationIP || !formData.sourcePort || !formData.destinationPort || !formData.packetSize) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      // Try to ensure model metadata is loaded; if it fails we will fall back to rule-based detection
      await xgboostModel.loadModel().catch(() => {
        // ignore - we'll use rules if model isn't available
      });

      let prediction: { isAttack: boolean; confidence: number; probability?: number; attackType: string };

      // If model is available, try model-based prediction, otherwise fallback to rule-based
      if (xgboostModel.isModelTrainedSync()) {
        try {
          prediction = xgboostModel.predictThreatLevel({
            packetSize: parseInt(formData.packetSize),
            protocol: formData.protocol,
            destinationPort: parseInt(formData.destinationPort),
            flags: formData.flags
          });
          // If model returned an invalid confidence (NaN/undefined/zero), treat as failed prediction
          if (!Number.isFinite(prediction.confidence) || prediction.confidence <= 0) {
            console.warn('Model returned non-finite or zero confidence, falling back to rule-based detection', prediction);
            const type = determineThreatType(formData);
            prediction = { isAttack: type !== 'Normal', confidence: type === 'Normal' ? 0.3 : 0.6, attackType: type };
          }
        } catch (predErr) {
          console.warn('Model prediction failed, falling back to rule-based:', predErr);
          const type = determineThreatType(formData);
          prediction = { isAttack: type !== 'Normal', confidence: type === 'Normal' ? 0.3 : 0.6, attackType: type };
        }
      } else {
        const type = determineThreatType(formData);
        prediction = { isAttack: type !== 'Normal', confidence: type === 'Normal' ? 0.3 : 0.6, attackType: type };
      }

      const severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Normal' = prediction.isAttack 
        ? (prediction.confidence >= 0.9 ? 'Critical' : prediction.confidence >= 0.75 ? 'High' : 'Medium')
        : 'Normal';

      const threatType = prediction.isAttack ? prediction.attackType : 'Normal';

      const analysisResult: {
        severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Normal';
        confidence: number;
        threatType: string;
        description: string;
      } = {
        severity,
        confidence: Number.isFinite(prediction.confidence) ? prediction.confidence : 0,
        threatType,
        description: prediction.isAttack 
          ? `Potential ${threatType} attack detected with ${(Number.isFinite(prediction.confidence) ? (prediction.confidence * 100).toFixed(1) : '0.0')}% confidence`
          : 'Traffic appears normal'
      };

      setResult(analysisResult);

      // Store in database - non-fatal: failures here should not break analysis flow
      try {
        await threatService.createNetworkTraffic({
          source_ip: formData.sourceIP,
          destination_ip: formData.destinationIP,
          protocol: formData.protocol,
          source_port: parseInt(formData.sourcePort),
          destination_port: parseInt(formData.destinationPort),
          packet_size: parseInt(formData.packetSize),
          classification: prediction.isAttack ? 'attack' : 'normal',
          ml_confidence: prediction.confidence,
          timestamp: new Date().toISOString(),
          flags: formData.flags || undefined
        });
      } catch (dbErr) {
        console.warn('Failed to persist network traffic (non-fatal):', dbErr);
      }

      if (prediction.isAttack) {
        try {
          await threatService.createThreatLog({
            threat_type: threatType,
            severity: severity,
            source_ip: formData.sourceIP,
            destination_ip: formData.destinationIP,
            protocol: formData.protocol,
            port: parseInt(formData.destinationPort),
            timestamp: new Date().toISOString(),
            status: 'detected',
            confidence_score: Math.round((Number.isFinite(prediction.confidence) ? prediction.confidence : 0) * 100),
            description: analysisResult.description,
            packet_size: parseInt(formData.packetSize)
          });
        } catch (logErr) {
          console.warn('Failed to persist threat log (non-fatal):', logErr);
        }

        // Send email alert for critical threats
        if (severity === 'Critical') {
          try {
            const { data: configData } = await supabase
              .from('system_config')
              .select('*')
              .single();
            // simple email validation before invoking edge function
            const isValidEmail = (email: any) => {
              if (!email || typeof email !== 'string') return false;
              const s = email.trim();
              const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              return re.test(s);
            };

            if (configData?.email_alerts && configData?.alert_email) {
              const email = configData.alert_email;
              if (!isValidEmail(email)) {
                console.warn('Configured alert_email is invalid, skipping email send:', String(email));
              } else {
                try {
                  await supabase.functions.invoke('send-threat-alert', {
                    body: {
                      email: email,
                      threatType: threatType,
                      severity: severity,
                      sourceIp: formData.sourceIP,
                      destinationIp: formData.destinationIP,
                      timestamp: new Date().toISOString(),
                      description: analysisResult.description,
                      confidenceScore: Math.round((Number.isFinite(prediction.confidence) ? prediction.confidence : 0) * 100)
                    }
                  });

                  toast({
                    title: "Email Alert Sent",
                    description: `Critical threat notification sent to ${email}`,
                  });
                } catch (emailErr) {
                  console.warn('Failed to invoke email function (non-fatal):', emailErr);
                }
              }
            }
          } catch (emailQueryErr) {
            console.warn('Failed to read system_config (non-fatal):', emailQueryErr);
          }
        }
      }

      toast({
        title: prediction.isAttack ? "⚠️ Threat Detected!" : "✓ Traffic Normal",
        description: analysisResult.description,
        variant: prediction.isAttack ? "destructive" : "default"
      });

    } catch (error) {
      console.error('Analysis error (unexpected):', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze packet",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // CSV parsing and KDD label mapping
  const mapKddLabelToAttackType = (labelRaw: string): string => {
    const label = labelRaw.trim().replace(/\.+$/, '').toLowerCase();
    const dos = new Set(['back','land','neptune','pod','smurf','teardrop','mailbomb','apache2','processtable','udpstorm','worm','mailbomb','land']);
    const probe = new Set(['satan','ipsweep','nmap','portsweep','mscan','saint','mscan','portsweep']);
    const r2l = new Set(['ftp_write','guess_passwd','imap','phf','multihop','warezmaster','warezclient','snmpgetattack','snmpguess','xlock','xsnoop','httptunnel','spy','snmpguess']);
    const u2r = new Set(['buffer_overflow','loadmodule','rootkit','perl','sqlattack','xterm','ps','loadmodule','perl']);

    if (label === 'normal') return 'Normal';
    if (dos.has(label)) return 'DoS';
    if (probe.has(label)) return 'Probe';
    if (r2l.has(label)) return 'R2L';
    if (u2r.has(label)) return 'U2R';

    // fallback detection using substrings
    if (/dos|flood|attack|smurf|neptune|pod|teardrop/.test(label)) return 'DoS';
    if (/scan|sweep|nmap|portscan|probe/.test(label)) return 'Probe';
    if (/r2l|ftp|guess|warez|snmp|phf/.test(label)) return 'R2L';
    if (/u2r|root|buffer|overflow/.test(label)) return 'U2R';

    return 'Normal';
  };

  const mapAttackTypeToSeverity = (attackType: string): 'Critical' | 'High' | 'Medium' | 'Low' | 'Normal' => {
    switch (attackType) {
      case 'DoS':
        return 'Critical';
      case 'U2R':
        return 'Critical';
      case 'R2L':
        return 'High';
      case 'Probe':
        return 'Medium';
      default:
        return 'Normal';
    }
  };

  const handleCsvFile = async (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const text = String(reader.result || '');
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      // Detect if header row is present by checking for non-numeric values in first line
      const hasHeader = lines[0].split(',').some(c => /[a-zA-Z]/.test(c));
      const startIndex = hasHeader ? 1 : 0;

  // Try to proactively load model metadata so CSV analysis can use it. If load fails, we'll still analyze via label mapping.
  await xgboostModel.loadModel().catch(() => {});
  // Pre-check whether model is loaded
  const modelAvailable = await xgboostModel.isModelTrained();

      const rows: Array<{ originalLabel: string; attackType: string; severity: string; modelConfidence?: number }> = [];
      for (let i = startIndex; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length === 0) continue;
        const parsed = parseKddRow(cols);
        const label = (parsed.label || parsed[KDD_COLUMNS[KDD_COLUMNS.length - 2]] || '').replace(/\.+$/, '');
        const attackTypeFromLabel = mapKddLabelToAttackType(label);

        // Map fields using parser
        const packetSize = Number(parsed.src_bytes || parsed['src_bytes'] || 0) || Number(parsed.dst_bytes || 0) || 0;
        const destPort = Number(parsed.dst_host_count || parsed['dst_host_count'] || 0) || 0; // best-effort
        const protocol = String(parsed.protocol_type || parsed['protocol_type'] || '').toUpperCase();

        let finalAttackType = attackTypeFromLabel;
        let modelConfidence: number | undefined = undefined;

        if (modelAvailable) {
          try {
            const pred = xgboostModel.predictThreatLevel({ packetSize, destinationPort: destPort, protocol });
            // only accept model confidence when it's a finite, positive number
            if (Number.isFinite(pred.confidence) && pred.confidence > 0) {
              modelConfidence = pred.confidence;
              // if model strongly disagrees with label mapping, use model's attackType
              if (pred.isAttack && pred.confidence >= 0.8) {
                finalAttackType = pred.attackType;
              }
            } else {
              console.warn('Skipping model result due to non-finite/zero confidence for CSV row', pred);
              modelConfidence = undefined;
            }
          } catch (err) {
            // model prediction failed for this row; ignore and use label mapping
            console.warn('Row prediction failed (non-fatal) for CSV row:', err);
            modelConfidence = undefined;
          }
        }

        const severity = (() => {
          const base = mapAttackTypeToSeverity(finalAttackType);
          // Up/down-grade severity based on model confidence when available
          if (modelConfidence !== undefined) {
            if (modelConfidence >= 0.95) return 'Critical';
            if (modelConfidence >= 0.85 && base !== 'Critical') return 'High';
            if (modelConfidence >= 0.7 && base === 'Normal') return 'Medium';
          }
          return base;
        })();

        rows.push({ originalLabel: label, attackType: finalAttackType, severity, modelConfidence });

        if (rows.length >= 20000) break; // safety cap
      }

      const counts: Record<string, number> = {};
      for (const r of rows) {
        counts[r.severity] = (counts[r.severity] || 0) + 1;
      }

      setCsvAnalysis({ total: rows.length, counts, rows: rows.slice(0, 200).map(r => ({ originalLabel: r.originalLabel, attackType: r.attackType, severity: r.severity })) });
      // persist full parsed rows for export via ref (kept in state as well)
      (window as any).__kdd_parsed_rows = rows; // lightweight persistence for export handler
    };
    reader.readAsText(file);
  };

  // Export CSV of analysis results (uses parsed rows from window.__kdd_parsed_rows)
  const exportCsvResults = () => {
    const rows: any[] = (window as any).__kdd_parsed_rows || [];
    if (!rows || rows.length === 0) {
      return;
    }
    const header = ['originalLabel','attackType','severity','modelConfidence'];
    const csv = [header.join(',')].concat(rows.map(r => `${r.originalLabel},${r.attackType},${r.severity},${r.modelConfidence ?? ''}`)).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kdd_analysis_results.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const determineThreatType = (data: typeof formData): string => {
    const port = parseInt(data.destinationPort);
    const size = parseInt(data.packetSize);

    // DoS: High packet size and TCP
    if (size > 1000 && data.protocol === 'TCP') return 'DoS';
    
    // Probe: Small packets with ICMP
    if (size < 200 && data.protocol === 'ICMP') return 'Probe';
    
    // R2L: SSH/FTP traffic
    if (port === 22 || port === 21) return 'R2L';
    
    // U2R: Privileged ports
    if (port < 1024) return 'U2R';
    
    return 'DoS';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Threat Injection & Analysis</h1>
          <p className="text-muted-foreground">Inject network packet data and analyze threats using trained XGBoost model</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Packet Information</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sourceIP">Source IP *</Label>
                <Input
                  id="sourceIP"
                  placeholder="192.168.1.100"
                  value={formData.sourceIP}
                  onChange={(e) => setFormData({ ...formData, sourceIP: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destinationIP">Destination IP *</Label>
                <Input
                  id="destinationIP"
                  placeholder="8.8.8.8"
                  value={formData.destinationIP}
                  onChange={(e) => setFormData({ ...formData, destinationIP: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="protocol">Protocol *</Label>
              <Select value={formData.protocol} onValueChange={(value) => setFormData({ ...formData, protocol: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TCP">TCP</SelectItem>
                  <SelectItem value="UDP">UDP</SelectItem>
                  <SelectItem value="ICMP">ICMP</SelectItem>
                  <SelectItem value="HTTP">HTTP</SelectItem>
                  <SelectItem value="HTTPS">HTTPS</SelectItem>
                  <SelectItem value="SSH">SSH</SelectItem>
                  <SelectItem value="FTP">FTP</SelectItem>
                  <SelectItem value="DNS">DNS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sourcePort">Source Port *</Label>
                <Input
                  id="sourcePort"
                  type="number"
                  placeholder="54321"
                  value={formData.sourcePort}
                  onChange={(e) => setFormData({ ...formData, sourcePort: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destinationPort">Destination Port *</Label>
                <Input
                  id="destinationPort"
                  type="number"
                  placeholder="80"
                  value={formData.destinationPort}
                  onChange={(e) => setFormData({ ...formData, destinationPort: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="packetSize">Packet Size (bytes) *</Label>
              <Input
                id="packetSize"
                type="number"
                placeholder="1500"
                value={formData.packetSize}
                onChange={(e) => setFormData({ ...formData, packetSize: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flags">TCP Flags (optional)</Label>
              <Input
                id="flags"
                placeholder="SYN,ACK"
                value={formData.flags}
                onChange={(e) => setFormData({ ...formData, flags: e.target.value })}
              />
            </div>

            <Button 
              onClick={handleAnalyze} 
              disabled={isAnalyzing}
              className="w-full"
              size="lg"
            >
              {isAnalyzing ? 'Analyzing...' : 'Inject & Analyze'}
            </Button>

            <div className="mt-4">
              <Label htmlFor="kddFile">Or upload KDD CSV (test/train) to analyze</Label>
              <input id="kddFile" type="file" accept=".csv" className="mt-2" onChange={(e) => handleCsvFile(e.target.files ? e.target.files[0] : null)} />
            </div>
          </div>
        </Card>

        {/* Results */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>
          {result ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border-2 ${
                result.severity === 'Critical' ? 'border-red-500 bg-red-500/10' :
                result.severity === 'High' ? 'border-orange-500 bg-orange-500/10' :
                result.severity === 'Medium' ? 'border-yellow-500 bg-yellow-500/10' :
                result.severity === 'Normal' ? 'border-green-500 bg-green-500/10' :
                'border-blue-500 bg-blue-500/10'
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  {result.severity === 'Normal' ? (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  ) : (
                    <AlertTriangle className={`h-8 w-8 ${
                      result.severity === 'Critical' ? 'text-red-500' :
                      result.severity === 'High' ? 'text-orange-500' :
                      'text-yellow-500'
                    }`} />
                  )}
                  <div>
                    <h3 className="text-2xl font-bold">{result.severity}</h3>
                    <p className="text-sm text-muted-foreground">Threat Level</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                  {csvAnalysis && (
                    <div className="mb-4 p-4 bg-muted rounded">
                      <h4 className="font-semibold">CSV Analysis</h4>
                      <p className="text-sm">Rows analyzed: {csvAnalysis.total}</p>
                      <div className="flex gap-3 mt-2">
                        {['Critical','High','Medium','Normal'].map(k => (
                          <div key={k} className="p-2 bg-secondary/40 rounded">
                            <div className="text-xs text-muted-foreground">{k}</div>
                            <div className="font-bold">{csvAnalysis.counts[k] || 0}</div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3">
                        <h5 className="font-medium">Sample Rows (first {csvAnalysis.rows.length})</h5>
                        <div className="overflow-auto max-h-40 mt-2">
                          <table className="w-full text-sm">
                            <thead>
                              <tr>
                                <th className="text-left">Original Label</th>
                                <th className="text-left">Attack Type</th>
                                <th className="text-left">Severity</th>
                              </tr>
                            </thead>
                            <tbody>
                              {csvAnalysis.rows.map((r, idx) => (
                                <tr key={idx} className="border-t">
                                  <td>{r.originalLabel}</td>
                                  <td>{r.attackType}</td>
                                  <td>{r.severity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                <div className="flex justify-between items-center p-3 bg-secondary/50 rounded">
                  <span className="font-medium">Threat Type:</span>
                  <span className="font-bold">{result.threatType}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-secondary/50 rounded">
                  <span className="font-medium">Confidence:</span>
                  <span className="font-bold">{(result.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="p-3 bg-secondary/50 rounded">
                  <span className="font-medium block mb-1">Description:</span>
                  <p className="text-sm">{result.description}</p>
                </div>

                {result.severity === 'Critical' && (
                  <div className="p-3 bg-red-500/20 border border-red-500 rounded">
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">
                      🚨 Critical threat detected! Email alert has been sent to configured address.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Shield className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Enter packet information and click "Inject & Analyze" to see results
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
