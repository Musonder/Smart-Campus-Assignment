/**
 * Administrator Reports Page
 * 
 * Report Generation System
 * 
 * Features:
 * - AdminSummaryReport (JSON/CSV/PDF)
 * - ComplianceAuditReport (JSON/CSV/PDF)
 * - LecturerCoursePerformanceReport (JSON/CSV/PDF)
 * - Runtime polymorphism for report types
 */

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { 
  FileText, 
  Download,
  FileJson,
  FileSpreadsheet,
  FileType,
  RefreshCw,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import apiClient from '@/lib/api-client'
import { getErrorMessage } from '@/lib/api-client'

type ReportType = 'admin_summary' | 'compliance_audit' | 'lecturer_performance'
type ReportFormat = 'json' | 'csv' | 'pdf'

interface ReportRequest {
  report_type: ReportType
  format: ReportFormat
  scope?: {
    start_date?: string
    end_date?: string
    department?: string
    course_id?: string
  }
}

export function AdminReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('admin_summary')
  const [format, setFormat] = useState<ReportFormat>('json')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (data: ReportRequest) => {
      const response = await apiClient.post('/api/v1/admin/reports/generate', data, {
        responseType: (format === 'pdf' || format === 'csv') ? 'blob' : 'json',
      })
      return response.data
    },
    onSuccess: (data, variables) => {
      toast.success(`Report generated successfully (${variables.format.toUpperCase()})`)
      
      // Download the file
      if (variables.format === 'pdf') {
        // data is already a Blob when responseType is 'blob'
        const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${reportType}_${new Date().toISOString()}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else if (variables.format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${reportType}_${new Date().toISOString()}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else if (variables.format === 'csv') {
        // data is already a Blob when responseType is 'blob'
        const blob = data instanceof Blob ? data : new Blob([data], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${reportType}_${new Date().toISOString()}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })

  const handleGenerate = () => {
    const request: ReportRequest = {
      report_type: reportType,
      format,
      scope: {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      },
    }
    generateReportMutation.mutate(request)
  }

  const getReportDescription = (type: ReportType) => {
    switch (type) {
      case 'admin_summary':
        return 'Comprehensive system overview with user statistics, course data, and facility metrics'
      case 'compliance_audit':
        return 'Security and compliance audit report with access logs and policy violations'
      case 'lecturer_performance':
        return 'Course performance metrics and student outcomes for lecturers'
      default:
        return ''
    }
  }


  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Reports & Analytics
        </h1>
        <p className="text-muted-foreground text-lg">
          Generate comprehensive reports in multiple formats
        </p>
      </div>

      {/* Report Generation Card */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
          <CardDescription>
            Select report type and format, then generate and download
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Type Selection */}
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin_summary">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Admin Summary Report</span>
                  </div>
                </SelectItem>
                <SelectItem value="compliance_audit">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Compliance Audit Report</span>
                  </div>
                </SelectItem>
                <SelectItem value="lecturer_performance">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Lecturer Performance Report</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {getReportDescription(reportType)}
            </p>
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Output Format</Label>
            <div className="grid grid-cols-3 gap-4">
              <Button
                variant={format === 'json' ? 'default' : 'outline'}
                className="h-auto flex-col py-4"
                onClick={() => setFormat('json')}
              >
                <FileJson className="h-6 w-6 mb-2" />
                <span>JSON</span>
              </Button>
              <Button
                variant={format === 'csv' ? 'default' : 'outline'}
                className="h-auto flex-col py-4"
                onClick={() => setFormat('csv')}
              >
                <FileSpreadsheet className="h-6 w-6 mb-2" />
                <span>CSV</span>
              </Button>
              <Button
                variant={format === 'pdf' ? 'default' : 'outline'}
                className="h-auto flex-col py-4"
                onClick={() => setFormat('pdf')}
              >
                <FileType className="h-6 w-6 mb-2" />
                <span>PDF</span>
              </Button>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date (Optional)</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date (Optional)</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={generateReportMutation.isPending}
            className="w-full"
            size="lg"
          >
            {generateReportMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Generate & Download Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Report Types Info */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Admin Summary</CardTitle>
            <CardDescription>System-wide statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• User statistics</li>
              <li>• Course metrics</li>
              <li>• Facility usage</li>
              <li>• System health</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Compliance Audit</CardTitle>
            <CardDescription>Security & compliance</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Access logs</li>
              <li>• Policy violations</li>
              <li>• Security incidents</li>
              <li>• GDPR compliance</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lecturer Performance</CardTitle>
            <CardDescription>Course analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Student outcomes</li>
              <li>• Grade distributions</li>
              <li>• Course completion</li>
              <li>• Engagement metrics</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

