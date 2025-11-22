/**
 * Administrator Analytics Dashboard
 * 
 * ML Model Management & Analytics
 * 
 * Features:
 * - EnrollmentPredictor (LSTM) - dropout probability
 * - RoomUsageOptimizer (PPO) - room allocation optimization
 * - Model versioning and explainability
 * - Real-time predictions and insights
 */

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { 
  BarChart3, 
  TrendingUp, 
  Brain, 
  RefreshCw,
  Info,
  Activity,
  Zap,
  Target
} from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import apiClient from '@/lib/api-client'
import { getErrorMessage } from '@/lib/api-client'

interface MLModel {
  id: string
  name: string
  type: 'enrollment_predictor' | 'room_optimizer'
  version: string
  status: 'active' | 'training' | 'inactive'
  accuracy?: number
  last_trained: string
  predictions_count: number
}

interface PredictionRequest {
  student_id: string
  gpa: number
  credits_enrolled: number
  attendance_rate: number
  engagement_score: number
  previous_dropout_risk?: number
  course_difficulty?: number
  study_hours: number
  num_failed_courses: number
  explain?: boolean
}

interface PredictionResponse {
  student_id: string
  dropout_probability: number
  retention_probability: number
  risk_level: string
  confidence: number
  explanation?: {
    features?: Array<{ name: string; importance: number }>
    reasoning?: string
    message?: string
  }
}

export function AdminAnalyticsPage() {
  const [predictionInput, setPredictionInput] = useState<PredictionRequest>({
    student_id: '00000000-0000-0000-0000-000000000000',
    gpa: 3.2,
    credits_enrolled: 15,
    attendance_rate: 85,
    engagement_score: 0.7,
    previous_dropout_risk: 0.0,
    course_difficulty: 0.5,
    study_hours: 20,
    num_failed_courses: 0,
    explain: true,
  })
  const [predictionResult, setPredictionResult] = useState<PredictionResponse | null>(null)

  // Fetch ML models - REAL API ONLY
  const { data: models, isLoading: modelsLoading, isError: modelsError } = useQuery({
    queryKey: ['admin-ml-models'],
    queryFn: async () => {
      const response = await apiClient.get<MLModel[]>('/api/v1/admin/ml/models')
      return response.data || []
    },
    retry: 2,
  })

  // Prediction mutation - REAL API
  const predictionMutation = useMutation({
    mutationFn: async (data: PredictionRequest) => {
      const response = await apiClient.post<PredictionResponse>('/api/v1/analytics/predict/enrollment', data)
      return response.data
    },
    onSuccess: (data) => {
      setPredictionResult(data)
      toast.success('Prediction generated successfully')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
      setPredictionResult(null)
    },
  })

  const handlePredict = () => {
    if (!predictionInput.student_id || !predictionInput.gpa) {
      toast.error('Please fill in required fields (Student ID and GPA)')
      return
    }
    predictionMutation.mutate(predictionInput)
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Analytics & Machine Learning
        </h1>
        <p className="text-muted-foreground text-lg">
          Manage ML models, generate predictions, and view insights
        </p>
      </div>

      {/* ML Models Overview */}
      {modelsLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle>Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : modelsError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Unable to Load ML Models
            </h3>
            <p className="text-muted-foreground mb-4">
              Failed to fetch ML models from the API
            </p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      ) : models && models.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {models.map((model) => (
          <Card key={model.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    {model.name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Version {model.version} • {model.type.replace('_', ' ')}
                  </CardDescription>
                </div>
                <Badge 
                  variant={model.status === 'active' ? 'default' : model.status === 'training' ? 'warning' : 'secondary'}
                >
                  {model.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Accuracy</p>
                    <p className="text-2xl font-bold">
                      {model.accuracy ? `${(model.accuracy * 100).toFixed(1)}%` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Predictions</p>
                    <p className="text-2xl font-bold">{model.predictions_count}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Last Trained</p>
                  <p className="text-sm font-medium">
                    {new Date(model.last_trained).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retrain
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Info className="h-4 w-4 mr-2" />
                    Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No ML Models Available
            </h3>
            <p className="text-muted-foreground">
              No machine learning models are currently configured
            </p>
          </CardContent>
        </Card>
      )}

      {/* Prediction Interface */}
      <Tabs defaultValue="enrollment" className="space-y-6">
        <TabsList>
          <TabsTrigger value="enrollment">Enrollment Predictor</TabsTrigger>
          <TabsTrigger value="optimizer">Room Optimizer</TabsTrigger>
          <TabsTrigger value="insights">Analytics Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="enrollment">
          <Card>
            <CardHeader>
              <CardTitle>Enrollment Dropout Prediction</CardTitle>
              <CardDescription>
                Predict student dropout probability using LSTM model with explainability
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gpa">GPA</Label>
                  <Input
                    id="gpa"
                    type="number"
                    step="0.1"
                    min="0"
                    max="4.0"
                    value={predictionInput.gpa}
                    onChange={(e) => setPredictionInput({ ...predictionInput, gpa: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="credits">Credits Enrolled</Label>
                  <Input
                    id="credits"
                    type="number"
                    value={predictionInput.credits_enrolled}
                    onChange={(e) => setPredictionInput({ ...predictionInput, credits_enrolled: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attendance">Attendance Rate (%)</Label>
                  <Input
                    id="attendance"
                    type="number"
                    min="0"
                    max="100"
                    value={predictionInput.attendance_rate}
                    onChange={(e) => setPredictionInput({ ...predictionInput, attendance_rate: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="engagement">Engagement Score (0-1)</Label>
                  <Input
                    id="engagement"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={predictionInput.engagement_score}
                    onChange={(e) => setPredictionInput({ ...predictionInput, engagement_score: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="study_hours">Study Hours/Week</Label>
                  <Input
                    id="study_hours"
                    type="number"
                    value={predictionInput.study_hours}
                    onChange={(e) => setPredictionInput({ ...predictionInput, study_hours: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="failed_courses">Failed Courses</Label>
                  <Input
                    id="failed_courses"
                    type="number"
                    min="0"
                    value={predictionInput.num_failed_courses}
                    onChange={(e) => setPredictionInput({ ...predictionInput, num_failed_courses: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <Button 
                onClick={handlePredict} 
                disabled={predictionMutation.isPending}
                className="w-full"
              >
                {predictionMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating Prediction...
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    Generate Prediction
                  </>
                )}
              </Button>

              {predictionResult && (
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Prediction Result</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Dropout Probability</p>
                        <p className="text-3xl font-bold text-foreground">
                          {(predictionResult.dropout_probability * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Retention Probability</p>
                        <p className="text-3xl font-bold text-green-600">
                          {(predictionResult.retention_probability * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Risk Level</p>
                      <Badge 
                        variant={
                          predictionResult.risk_level === 'high' ? 'destructive' :
                          predictionResult.risk_level === 'medium' ? 'default' : 'secondary'
                        }
                        className="text-lg px-4 py-2"
                      >
                        {predictionResult.risk_level.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Confidence</p>
                      <p className="text-lg font-semibold">
                        {(predictionResult.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                    {predictionResult.explanation && (
                      <div className="space-y-4">
                        {predictionResult.explanation.features && (
                          <div>
                            <p className="text-sm font-medium mb-2">Feature Importance</p>
                            <div className="space-y-2">
                              {predictionResult.explanation.features.map((feature, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                  <span className="text-sm">{feature.name}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-primary"
                                        style={{ width: `${Math.abs(feature.importance) * 100}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-muted-foreground w-12 text-right">
                                      {(feature.importance * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {predictionResult.explanation.reasoning && (
                          <div>
                            <p className="text-sm font-medium mb-2">Reasoning</p>
                            <p className="text-sm text-muted-foreground">
                              {predictionResult.explanation.reasoning}
                            </p>
                          </div>
                        )}
                        {predictionResult.explanation.message && (
                          <div>
                            <p className="text-sm font-medium mb-2">Note</p>
                            <p className="text-sm text-muted-foreground">
                              {predictionResult.explanation.message}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimizer">
          <Card>
            <CardHeader>
              <CardTitle>Room Usage Optimizer</CardTitle>
              <CardDescription>
                PPO reinforcement learning model for optimal room allocation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Zap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Room Optimizer</h3>
                <p className="text-muted-foreground mb-4">
                  Optimize room assignments to minimize energy usage and travel time
                </p>
                <Button>
                  <Activity className="h-4 w-4 mr-2" />
                  Run Optimization
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Model Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Performance metrics and charts
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Usage Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Model usage and prediction statistics
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

