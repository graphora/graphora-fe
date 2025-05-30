'use client'

import React from 'react'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { PageHeader } from '@/components/layouts/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Database, 
  Zap, 
  GitMerge, 
  BarChart3, 
  MessageSquare,
  ArrowRight,
  Sparkles,
  Users,
  FileText,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'

const features = [
  {
    title: 'Define Ontology',
    description: 'Create and manage your knowledge graph structure with our intuitive ontology editor.',
    icon: <Database className="h-6 w-6" />,
    href: '/ontology',
    color: 'bg-blue-50 text-blue-600',
    status: 'Ready'
  },
  {
    title: 'Transform Data',
    description: 'Upload documents and transform them into structured knowledge graphs.',
    icon: <Zap className="h-6 w-6" />,
    href: '/transform',
    color: 'bg-purple-50 text-purple-600',
    status: 'Ready'
  },
  {
    title: 'Merge Graphs',
    description: 'Combine multiple knowledge graphs and resolve conflicts intelligently.',
    icon: <GitMerge className="h-6 w-6" />,
    href: '/merge',
    color: 'bg-emerald-50 text-emerald-600',
    status: 'Ready'
  },
  {
    title: 'Domain Apps',
    description: 'Explore domain-specific applications and visualizations.',
    icon: <BarChart3 className="h-6 w-6" />,
    href: '/domain-apps',
    color: 'bg-orange-50 text-orange-600',
    status: 'Ready'
  },
  {
    title: 'AI Assistant',
    description: 'Chat with AI to explore your data and get insights.',
    icon: <MessageSquare className="h-6 w-6" />,
    href: '/chat',
    color: 'bg-pink-50 text-pink-600',
    status: 'Beta'
  }
]

const stats = [
  { label: 'Knowledge Graphs Created', value: '1,200+' },
  { label: 'Documents Processed', value: '50K+' },
  { label: 'Entities Extracted', value: '2.5M+' },
  { label: 'Active Users', value: '500+' }
]

export default function Home() {
  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="Welcome to Graphora"
          description="Transform your documents into intelligent knowledge graphs with our comprehensive platform"
          icon={<Sparkles className="h-6 w-6" />}
          actions={
            <div className="flex items-center space-x-3">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Dashboard
                </Button>
              </Link>
              <Link href="/ontology">
                <Button size="sm">
                  Get Started
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          }
        />

        <div className="flex-1 overflow-auto p-6 space-y-8">
          {/* Hero Section */}
          <div className="text-center py-12">
            <div className="max-w-3xl mx-auto space-y-6">
              <h2 className="text-3xl font-bold text-slate-900">
                Build Intelligent Knowledge Graphs
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                Graphora helps you extract, structure, and visualize knowledge from your documents. 
                Create powerful knowledge graphs that unlock insights and enable intelligent applications.
              </p>
              
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                    <div className="text-sm text-slate-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                Complete Workflow
              </h3>
              <p className="text-slate-600">
                From ontology definition to intelligent applications
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer">
                  <Link href={feature.href}>
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${feature.color}`}>
                          {feature.icon}
                        </div>
                        <Badge 
                          variant={feature.status === 'Beta' ? 'secondary' : 'outline'}
                          className={feature.status === 'Beta' ? 'bg-blue-100 text-blue-700' : ''}
                        >
                          {feature.status}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                        {feature.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-slate-600 leading-relaxed">
                        {feature.description}
                      </CardDescription>
                      <div className="flex items-center mt-4 text-sm text-blue-600 group-hover:text-blue-700 transition-colors">
                        <span>Get started</span>
                        <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          </div>

          {/* Getting Started Section */}
          <Card className="border-slate-200 shadow-sm bg-gradient-to-r from-blue-50 to-purple-50">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <h3 className="text-xl font-bold text-slate-900">
                  Ready to Get Started?
                </h3>
                <p className="text-slate-600 max-w-2xl mx-auto">
                  Begin your knowledge graph journey by defining your ontology or jump straight into 
                  transforming your first document.
                </p>
                <div className="flex items-center justify-center space-x-4 pt-4">
                  <Link href="/ontology">
                    <Button>
                      <Database className="h-4 w-4 mr-2" />
                      Start with Ontology
                    </Button>
                  </Link>
                  <Link href="/transform">
                    <Button variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      Upload Document
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
