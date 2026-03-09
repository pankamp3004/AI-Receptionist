"""
RAG Client for the Voice Agent
This runs separately from the FastAPI backend and queries Pinecone directly
during a live call to inject knowledge base context into the LLM prompt.
"""

import os
import logging
from langchain_openai import OpenAIEmbeddings
from pinecone import Pinecone
from dotenv import load_dotenv

logger = logging.getLogger("rag_client")


class VoiceAgentRAGClient:
    def __init__(self):
        # Load from root .env manually to be safe, overriding any stale env vars
        load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"), override=True)
        
        # Read keys *after* dotenv is loaded and strip any invisible whitespace/newlines
        self.pinecone_index_name = os.getenv("PINECONE_INDEX_NAME", "ai-receptionist").strip()
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "").strip()
        self.pinecone_api_key = os.getenv("PINECONE_API_KEY", "").strip()

        self.enabled = bool(self.openai_api_key and self.pinecone_api_key)
        if not self.enabled:
            logger.warning("RAG Client disabled: OPENAI_API_KEY or PINECONE_API_KEY missing.")
            return
            
        try:
            self.pc = Pinecone(api_key=self.pinecone_api_key)
            self.index = self.pc.Index(self.pinecone_index_name)
            self.embeddings = OpenAIEmbeddings(
                model="text-embedding-3-small", 
                openai_api_key=self.openai_api_key
            )
        except Exception as e:
            logger.error(f"Failed to initialize RAG client: {e}")
            self.enabled = False

    async def search_knowledge(self, question: str, organization_id: str, top_k: int = 3) -> str:
        """
        Search Pinecone for the most relevant text chunks to answer the question,
        strictly filtered by organization_id.
        """
        if not self.enabled:
            return "Knowledge base search is currently unavailable."
            
        try:
            # 1. Embed the question
            logger.info(f"RAG Search: '{question}' for org {organization_id}")
            # Note: We use embed_query which is blocking, but fast enough for small queries
            # In a highly concurrent async environment we'd use aembed_query
            query_embedding = await self.embeddings.aembed_query(question)
            
            # 2. Query Pinecone using namespace physically separating tenant data
            result = self.index.query(
                namespace=str(organization_id),
                vector=query_embedding,
                filter={"organization_id": {"$eq": str(organization_id)}},
                top_k=top_k,
                include_metadata=True, 
                include_values=False 
            )
            
            # 3. Format results
            if not result.matches:
                return "I couldn't find any information about that in the hospital's knowledge base."
                
            context_chunks = []
            for match in result.matches:
                # Only include chunks with a reasonable confidence score
                if getattr(match, 'score', 0) > 0.2:
                    text = match.metadata.get("text", "")
                    if text:
                        context_chunks.append(text)
            
            if not context_chunks:
                return "I couldn't find any highly relevant information about that in the knowledge base."
                
            formatted_context = "Here is the relevant information from the hospital's knowledge base:\n\n"
            formatted_context += "\n---\n".join(context_chunks)
            
            return formatted_context

        except Exception as e:
            logger.error(f"RAG search failed: {e}", exc_info=True)
            return "There was an error searching the knowledge base."


# Global instance for the voice agent to use
rag_client = VoiceAgentRAGClient()
