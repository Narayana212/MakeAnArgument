/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Search, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'

const sampleQuestions = [
  {
    title: "BERT Fine-tuning for Domain Texts",
    question: "What are the best fine-tuning techniques for BERT models on domain-specific corpora like medical or legal text?"
  },
  {
    title: "GANs for Data Augmentation",
    question: "How can generative adversarial networks (GANs) be used for data augmentation?"
  },
  {
    title: "Attention vs ARIMA Models",
    question: "What are the benefits of attention-based models over traditional ARIMA in stock price prediction?"
  }
]

export default function ResearchSearch() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<{ answer: string; keywords?: string; papers?: any[]; isBasicAnswer?: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    document.documentElement.classList.add('dark')
  }, [])

  if (!mounted) return null

  const handleSearch = async (searchQuery: string) => {
    setLoading(true)
    setError(null)
    setQuery(searchQuery)
    try {
      const response = await fetch(`/api/v1/main?query=${encodeURIComponent(searchQuery)}`)
      if (!response.ok) {
        throw new Error('Network response was not ok')
      }
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error:', error)
      setError('An error occurred while processing your request. Please try again.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(query)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 text-foreground">
      <div className="container mx-auto p-4 pt-8 md:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Win an Argument
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Based on ArXiv research papers
          </p>
        </motion.div>

        {/* Sample Questions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8"
        >
          {sampleQuestions.map((item, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card 
                className="cursor-pointer border border-purple-500/20 hover:border-purple-500/40 transition-colors"
                onClick={() => handleSearch(item.question)}
              >
                <CardHeader className="p-4">
                  <CardTitle className="text-sm text-purple-400">{item.title}</CardTitle>
                  <CardDescription className="text-xs">{item.question}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.form 
          onSubmit={handleSubmit}
          className="mb-12 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex gap-3 p-2 rounded-lg bg-muted/50 backdrop-blur">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your research question"
                className="pl-10 bg-transparent border-none shadow-none focus-visible:ring-1 focus-visible:ring-purple-500"
              />
            </div>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg shadow-purple-500/25"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  Searching...
                </span>
              ) : (
                'Search'
              )}
            </Button>
          </div>
        </motion.form>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto"
            >
              <Card className="border border-muted bg-card/50 backdrop-blur">
                <CardHeader className="space-y-4 pb-6">
                  <Sparkles className="w-7 h-7 animate-pulse text-purple-500" />
                  <Skeleton className="h-6 w-[200px]" />
                  <Skeleton className="h-4 w-[160px]" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[90%]" />
                  <Skeleton className="h-4 w-[80%]" />
                  <div className="mt-8 space-y-3">
                    <Skeleton className="h-4 w-[140px]" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto"
            >
              <Card className="border-red-500/50 bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-500">
                    <AlertCircle className="w-5 h-5" />
                    Error
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{error}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {(result && !loading) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto"
            >
              <Card className="border border-muted bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-7 h-7 text-purple-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown>{result.answer}</ReactMarkdown>
                  </div>

                  {result.papers && result.papers.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="mt-6"
                    >
                      <h3 className="font-semibold mb-3">Relevant Papers:</h3>
                      <div className="space-y-3">
                        {result.papers.map((paper, index) => (
                          <motion.a
                            key={index}
                            href={`https://arxiv.org/abs/${paper.id.split('/').pop()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                          >
                            <h4 className="font-medium text-purple-400 hover:text-purple-300 transition-colors">
                              {paper.title}
                            </h4>
                          </motion.a>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

