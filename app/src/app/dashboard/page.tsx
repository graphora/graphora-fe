'use client'

import React from 'react'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { PageHeader } from '@/components/layouts/page-header'
import { StatusIndicator } from '@/components/ui/status-indicator'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3, 
  Database, 
  FileText, 
  GitMerge, 
  Zap, 
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  Clock,
  CheckCircle,
  ArrowRight,
  Plus,
  Eye,
  Download,
  Share2,
  AlertCircle,
  Sparkles,
  Upload
} from 'lucide-react'
import Link from 'next/link'

// Mock data for demonstration
const workflowSteps = [
  { 
    id: 'ontology', 
    name: 'Ontology Definition', 
    status: 'completed', 
    progress: 100,
    estimatedTime: '15-30 min',
    completedAt: '2 hours ago'
  },
  { 
    id: 'upload', 
    name: 'Document Upload', 
    status: 'completed', 
    progress: 100,
    estimatedTime: '5-10 min',
    completedAt: '1 hour ago'
  },
  { 
    id: 'transform', 
    name: 'Data Transformation', 
    status: 'current', 
    progress: 65,
    estimatedTime: '20-45 min',
    timeRemaining: '15 min remaining'
  },
  { 
    id: 'merge', 
    name: 'Graph Merging', 
    status: 'pending', 
    progress: 0,
    estimatedTime: '10-20 min',
    timeRemaining: 'Not started'
  },
  { 
    id: 'analysis', 
    name: 'Analysis & Insights', 
    status: 'pending', 
    progress: 0,
    estimatedTime: '5-15 min',
    timeRemaining: 'Not started'
  }
]

const recentProjects = [
  {
    id: 1,
    name: 'Healthcare Knowledge Graph',
    description: 'Patient pathway analysis and treatment optimization',
    status: 'pending' as const,
    progress: 75,
    lastUpdated: '2 hours ago',
    entities: 1247,
    relationships: 3891,
    trend: 'up'
  },
  {
    id: 2,
    name: 'Financial Risk Assessment',
    description: 'Corporate relationship mapping and risk analysis',
    status: 'success' as const,
    progress: 100,
    lastUpdated: '1 day ago',
    entities: 892,
    relationships: 2156,
    trend: 'stable'
  },
  {
    id: 3,
    name: 'Supply Chain Optimization',
    description: 'Vendor relationship analysis and bottleneck identification',
    status: 'warning' as const,
    progress: 45,
    lastUpdated: '3 hours ago',
    entities: 634,
    relationships: 1423,
    trend: 'down'
  },
  {
    id: 4,
    name: 'Customer Journey Mapping',
    description: 'E-commerce user behavior and conversion analysis',
    status: 'loading' as const,
    progress: 20,
    lastUpdated: '30 minutes ago',
    entities: 423,
    relationships: 987,
    trend: 'up'
  }
]

const metrics = [
  {
    title: 'Total Knowledge Graphs',
    value: '24',
    change: '+12%',
    trend: 'up',
    icon: <Database className="h-5 w-5" />,
    description: 'Active graphs in your workspace'
  },
  {
    title: 'Documents Processed',
    value: '1,247',
    change: '+23%',
    trend: 'up',
    icon: <FileText className="h-5 w-5" />,
    description: 'Total documents transformed'
  },
  {
    title: 'Entities Extracted',
    value: '45.2K',
    change: '+8%',
    trend: 'up',
    icon: <Activity className="h-5 w-5" />,
    description: 'Unique entities identified'
  },
  {
    title: 'Active Collaborators',
    value: '8',
    change: '+2',
    trend: 'up',
    icon: <Users className="h-5 w-5" />,
    description: 'Team members working on projects'
  }
]

const quickActions = [
  {
    title: 'Create New Graph',
    description: 'Start with ontology definition',
    icon: <Plus className="h-5 w-5" />,
    href: '/ontology',
    color: 'bg-blue-50 text-blue-600 hover:bg-blue-100'
  },
  {
    title: 'Upload Documents',
    description: 'Transform documents to graphs',
    icon: <Upload className="h-5 w-5" />,
    href: '/transform',
    color: 'bg-purple-50 text-purple-600 hover:bg-purple-100'
  },
  {
    title: 'Merge Graphs',
    description: 'Combine existing graphs',
    icon: <GitMerge className="h-5 w-5" />,
    href: '/merge',
    color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
  },
  {
    title: 'AI Assistant',
    description: 'Get insights from your data',
    icon: <Sparkles className="h-5 w-5" />,
    href: '/chat',
    color: 'bg-pink-50 text-pink-600 hover:bg-pink-100'
  }
]

export default function DashboardPage() {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />
      case 'current':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-slate-400" />
      default:
        return <AlertCircle className="h-4 w-4 text-slate-400" />
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-emerald-600" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Activity className="h-4 w-4 text-slate-400" />
    }
  }

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="Dashboard"
          description="Overview of your knowledge graph projects and workflow progress"
          icon={<BarChart3 className="h-6 w-6" />}
          actions={
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Link href="/ontology">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </Link>
            </div>
          }
        />

        <div className="flex-1 overflow-auto p-6 space-y-8">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric, index) => (
              <Card key={index} className="border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-slate-50 rounded-lg">
                        {metric.icon}
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-900">{metric.value}</div>
                        <div className="text-sm text-slate-600">{metric.title}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getTrendIcon(metric.trend)}
                      <span className={`text-sm font-medium ${
                        metric.trend === 'up' ? 'text-emerald-600' : 
                        metric.trend === 'down' ? 'text-red-600' : 'text-slate-600'
                      }`}>
                        {metric.change}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{metric.description}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Workflow Progress */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Current Workflow Progress</CardTitle>
                  <CardDescription>Healthcare Knowledge Graph Project</CardDescription>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  In Progress
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {workflowSteps.map((step, index) => (
                <div key={step.id} className="flex items-center space-x-4 p-4 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="flex-shrink-0">
                    {getStatusIcon(step.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-slate-900">{step.name}</div>
                      <div className="text-sm text-slate-500">
                        {step.status === 'completed' ? step.completedAt : 
                         step.status === 'current' ? step.timeRemaining : 
                         step.estimatedTime}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Progress value={step.progress} className="flex-1 h-2" />
                      <span className="text-sm font-medium text-slate-600 min-w-[3rem]">
                        {step.progress}%
                      </span>
                    </div>
                  </div>

                  {step.status === 'current' && (
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Projects */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Recent Projects</CardTitle>
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentProjects.map((project) => (
                  <div key={project.id} className="p-4 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors cursor-pointer group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                          {project.name}
                        </div>
                        <div className="text-sm text-slate-600 mt-1">{project.description}</div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        {getTrendIcon(project.trend)}
                        <StatusIndicator 
                          status={project.status} 
                          size="sm"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <div className="flex items-center space-x-4">
                        <span>{project.entities} entities</span>
                        <span>{project.relationships} relationships</span>
                      </div>
                      <span>{project.lastUpdated}</span>
                    </div>
                    
                    <div className="mt-3">
                      <Progress value={project.progress} className="h-1.5" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription>Start a new workflow or continue existing work</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {quickActions.map((action, index) => (
                  <Link key={index} href={action.href}>
                    <div className={`p-4 rounded-lg transition-all duration-200 cursor-pointer group ${action.color}`}>
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {action.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium group-hover:translate-x-1 transition-transform">
                            {action.title}
                          </div>
                          <div className="text-sm opacity-75 mt-1">
                            {action.description}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 