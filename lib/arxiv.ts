/* eslint-disable @typescript-eslint/no-explicit-any */
import { parseStringPromise } from 'xml2js';

const BASE_URL = "http://export.arxiv.org/api/query";

export async function fetchArxivPapers(query: string) {
  const searchQuery = {
    search_query: `all:"${query}"`,
    start: '0',
    max_results: '5',
    sortBy: 'relevance',
    sortOrder: 'descending',
  };

  const queryString = new URLSearchParams(searchQuery).toString();
  const response = await fetch(`${BASE_URL}?${queryString}`);
  
  if (!response.ok) {
    throw new Error('ArXiv API request failed');
  }

  const xml = await response.text();
  const result = await parseStringPromise(xml, { explicitArray: false });
  
  return processArxivResponse(result);
}

export function processArxivResponse(result: any) {
  if (!result.feed.entry) {
    return [];
  }

  const entries = Array.isArray(result.feed.entry) 
    ? result.feed.entry 
    : [result.feed.entry];

  return entries.map((entry: any) => ({
    id: entry.id,
    title: entry.title,
    summary: entry.summary,
    authors: Array.isArray(entry.author) 
      ? entry.author.map((a: any) => a.name).join(', ')
      : entry.author.name,
    link: entry.link.$.href,
  }));
}

