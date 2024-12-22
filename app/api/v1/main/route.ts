import { NextRequest, NextResponse } from 'next/server';
import { parseStringPromise } from 'xml2js';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { Index } from '@pinecone-database/pinecone';
import { pinecone } from '@/lib/pinecone';

const baseURL = "http://export.arxiv.org/api/query";
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  throw new Error("Missing required environment variable: GOOGLE_API_KEY");
}

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const embeddingModel: GenerativeModel = genAI.getGenerativeModel({ model: "embedding-001" });
const chatModel: GenerativeModel = genAI.getGenerativeModel({ model: "gemini-pro" });

const indexName = "arxiv-papers";

interface ArxivPaper {
  id: string;
  title: string;
  summary: string;
  author: { name: string } | { name: string }[];
  category: { $: { term: string } } | { $: { term: string } }[];
  published: string;
}

interface RelevantPaper {
  title: string;
  abstract: string;
  authors: string;
  categories: string;
  published: string;
  similarity: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userQuery = searchParams.get('query') || "Can cows grow";

    const keywords = await extractKeywords(userQuery);
    const papers = await fetchArxivPapers(keywords);
    if (papers.length === 0) {
      const noResultsAnswer = await generateNoResultsAnswer(userQuery);
      return NextResponse.json({ answer: noResultsAnswer, keywords, papers: [] });
    }
    await upsertToPinecone(papers);
    const relevantPapers = await performVectorSearch(userQuery);
    const answer = await generateAnswer(userQuery, relevantPapers);

    return NextResponse.json({ answer, keywords, papers });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "An error occurred while processing the request" }, { status: 500 });
  }
}

async function extractKeywords(query: string) {
  const prompt = `Extract 3-5 key terms or phrases from the following question and format them in the arXiv API query style: all:"term1" OR all:"term2" and so on. Ensure the output follows this exact format.

Question: ${query}`;

  const result = await chatModel.generateContent(prompt);
  const keywordsText = result.response.text();
  console.log(keywordsText, "keywords");
  return keywordsText;
}

async function fetchArxivPapers(keywords: string): Promise<ArxivPaper[]> {
  const query = {
    search_query: keywords,
    start: '0',
    max_results: '10',
    sortBy: 'relevance',
    sortOrder: 'descending',
  };

  const queryString = Object.entries(query)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

  const url = `${baseURL}?${queryString}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`);
  }

  const xml = await response.text();
  const result = await parseStringPromise(xml, { explicitArray: false });

  const entries = result.feed.entry;
  if (!entries) {
    return [];
  }

  console.log(entries, "papers");
  return Array.isArray(entries) ? entries : [entries];
}

async function upsertToPinecone(papers: ArxivPaper[]): Promise<void> {
  const index: Index = pinecone.Index(indexName);

  const upsertPromises = papers.map(async (paper) => {
    const embeddingResult = await embeddingModel.embedContent(paper.summary);
    const embedding = Array.from(embeddingResult.embedding.values);

    // Ensure categories is a string or array of strings
    let categories: string | string[];
    if (Array.isArray(paper.category)) {
      categories = paper.category.map(c => c.$.term);
    } else {
      categories = paper.category.$.term;
    }

    return index.upsert([
      {
        id: paper.id,
        values: embedding,
        metadata: {
          title: paper.title,
          abstract: paper.summary,
          authors: Array.isArray(paper.author) ? paper.author.map(a => a.name).join(', ') : paper.author.name,
          categories: categories,
          published: paper.published,
        },
      },
    ]);
  });

  await Promise.all(upsertPromises);
}

async function performVectorSearch(query: string): Promise<RelevantPaper[]> {
  const index: Index = pinecone.Index(indexName);

  const questionEmbed = await embeddingModel.embedContent(query);
  const questionEmbedding = Array.from(questionEmbed.embedding.values);

  const queryResponse = await index.query({
    vector: questionEmbedding,
    topK: 5,
    includeMetadata: true,
    includeValues: true,
  });

  return queryResponse.matches
    .filter(match => match.metadata && match.score !== undefined)
    .map(match => ({
      title: match.metadata!.title as string,
      abstract: match.metadata!.abstract as string,
      authors: match.metadata!.authors as string,
      categories: match.metadata!.categories as string,
      published: match.metadata!.published as string,
      similarity: match.score as number,
    }));
}

async function generateAnswer(query: string, relevantPapers: RelevantPaper[]): Promise<string> {
  const context = relevantPapers.map(paper =>
    `Title: ${paper.title}
Authors: ${paper.authors}
Categories: ${paper.categories}
Published: ${paper.published}
Similarity: ${paper.similarity.toFixed(4)}
Abstract: ${paper.abstract}`
  ).join('\n\n');

  const prompt = `You are an AI research assistant specializing in machine learning and time series forecasting. Answer the following question based on the provided research paper summaries. If the information is not sufficient, say so, but try to provide insights from what is available.

Question: "${query}"

Context (summaries of relevant papers, ordered by relevance):
${context}

Instructions:
1. Synthesize information from the provided papers to answer the question.
2. Highlight any conflicting findings or perspectives from different papers.
3. Mention any limitations or gaps in the current research related to the question.
4. Suggest potential areas for further research based on the findings.
5. Do not mention specific papers by title in your response, but integrate their insights.
6. If you don't find enough relevant info, provide a general concise answer based on your understanding of the question.
7. If you cannot provide an answer based on the provided context, give a general answer based on your understanding of the question.
8. Don't repeat the question in your response.

Please provide a clear, concise, and informative answer:`;

  const finalResponse = await chatModel.generateContent(prompt);
  return finalResponse.response.text();
}

async function generateNoResultsAnswer(query: string): Promise<string> {
  const prompt = `You are an AI research assistant. The following question was asked, but no relevant arXiv papers were found. Please provide a general response based on your knowledge:

Question: "${query}"

Instructions:
1. Provide a brief, informative answer to the question based on general knowledge.
2. Mention that no specific arXiv papers were found for this query.
3. Suggest some related topics or areas that the user might want to explore instead.
4. Don't repeat the question in your response.

Please provide a clear and helpful response:`;

  const response = await chatModel.generateContent(prompt);
  return response.response.text();
}

