"""
RAG Service: Handles PDF extraction, chunking, OpenAI embeddings, and Pinecone vector ops.
"""

import os
import io
import uuid
import logging
from typing import List, Dict, Any

from PyPDF2 import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv

# Load root .env file where the user added the keys, override any stale environment vars
load_dotenv(os.path.join(os.path.dirname(__file__), "../../../.env"), override=True)

logger = logging.getLogger(__name__)

class RAGServiceError(Exception):
    pass

class RAGService:
    def __init__(self):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=150,
            separators=["\n\n", "\n", ".", " ", ""]
        )

    def _get_pinecone_index(self):
        # Always reload to guarantee fresh keys
        load_dotenv(os.path.join(os.path.dirname(__file__), "../../../.env"), override=True)
        pinecone_key = os.getenv("PINECONE_API_KEY", "").strip()
        index_name = os.getenv("PINECONE_INDEX_NAME", "ai-receptionist").strip()
        
        if not pinecone_key:
            return None
            
        pc = Pinecone(api_key=pinecone_key)
        
        # Auto-create if not exists
        existing_indexes = [index_info["name"] for index_info in pc.list_indexes()]
        if index_name not in existing_indexes:
            logger.info(f"Creating Pinecone index '{index_name}'...")
            pc.create_index(
                name=index_name,
                dimension=1536,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1")
            )
        return pc.Index(index_name)

    def _get_embeddings(self):
        openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        if not openai_key:
            return None
        return OpenAIEmbeddings(
            model="text-embedding-3-small", 
            openai_api_key=openai_key
        )

    def _extract_text_from_pdf(self, file_bytes: bytes) -> str:
        """Extract all text from a PDF file in memory."""
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            text = ""
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
            return text
        except Exception as e:
            logger.error(f"Failed to extract text from PDF: {e}")
            raise RAGServiceError(f"PDF Parsing Failed: {str(e)}")

    async def process_pdf(self, file_bytes: bytes, doc_id: str, organization_id: str) -> int:
        """
        Extract text, chunk it, embed it, and upsert to Pinecone.
        Returns the number of chunks processed.
        """
        index = self._get_pinecone_index()
        embeddings = self._get_embeddings()
        
        if not index or not embeddings:
            raise RAGServiceError("RAG Service not properly configured (missing API keys)")

        try:
            # 1. Extract text
            logger.info(f"Extracting text for doc {doc_id}")
            text = self._extract_text_from_pdf(file_bytes)
            
            if not text.strip():
                raise RAGServiceError("No text found in PDF")

            # 2. Chunk text
            logger.info(f"Chunking text for doc {doc_id}")
            chunks = self.text_splitter.split_text(text)
            
            if not chunks:
                return 0

            # 3. Embed chunks (batching for performance)
            logger.info(f"Embedding {len(chunks)} chunks for doc {doc_id}")
            vectors_to_upsert = []
            
            # Embed in batches of 100 to avoid OpenAI limits
            batch_size = 100
            for i in range(0, len(chunks), batch_size):
                batch_chunks = chunks[i:i+batch_size]
                
                # Get embeddings
                batch_embeddings = embeddings.embed_documents(batch_chunks)
                
                for j, (chunk_text, embedding) in enumerate(zip(batch_chunks, batch_embeddings)):
                    chunk_id = f"{doc_id}_chunk_{i+j}"
                    vectors_to_upsert.append({
                        "id": chunk_id,
                        "values": embedding,
                        "metadata": {
                            "organization_id": str(organization_id),
                            "doc_id": str(doc_id),
                            "text": chunk_text
                        }
                    })

            # 4. Upsert to Pinecone
            logger.info(f"Upserting {len(vectors_to_upsert)} vectors to Pinecone for doc {doc_id}")
            # Upsert in batches of 100 to Pinecone using organization_id as namespace
            for i in range(0, len(vectors_to_upsert), 100):
                batch = vectors_to_upsert[i:i+100]
                index.upsert(vectors=batch, namespace=organization_id)
                
            logger.info(f"Successfully processed doc {doc_id} into {len(chunks)} chunks in namespace {organization_id}")
            return len(chunks)

        except RAGServiceError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error processing PDF {doc_id}: {e}", exc_info=True)
            raise RAGServiceError(f"Unexpected error: {str(e)}")

    def delete_document_vectors(self, doc_id: str, organization_id: str) -> None:
        """
        Delete all vectors associated with a specific document ID from the org namespace.
        Note: Pinecone Serverless doesn't support metadata deletion directly yet,
        so we have to query by metadata to get IDs, then delete by IDs.
        """
        index = self._get_pinecone_index()
        if not index:
            return

        try:
            logger.info(f"Deleting vectors for doc {doc_id} from Pinecone")
            
            # 1. Query Pinecone to find all vector IDs for this doc_id
            # We use a dummy vector [0]*1536 since we only care about the metadata filter
            dummy_vector = [0.0] * 1536
            
            # We might have more than 10k chunks, but usually a single PDF is much less.
            # We'll grab up to 10,000 to be safe
            result = index.query(
                vector=dummy_vector,
                filter={"doc_id": {"$eq": str(doc_id)}},
                namespace=organization_id,
                top_k=10000,
                include_metadata=False
            )
            
            vector_ids = [match.id for match in result.matches]
            
            # 2. Delete those specific IDs (Pinecone requires namespace when deleting by ID if they were upserted in a namespace)
            if vector_ids:
                logger.info(f"Found {len(vector_ids)} vectors to delete for doc {doc_id}. Deleting from namespace {organization_id}...")
                index.delete(ids=vector_ids, namespace=organization_id)
                logger.info(f"Vectors for doc {doc_id} deleted successfully.")
            else:
                logger.info(f"No vectors found for doc {doc_id} to delete.")
                
        except Exception as e:
            logger.error(f"Error deleting vectors for doc {doc_id}: {e}", exc_info=True)
            # We don't raise here, we don't want to block the DB deletion if Pinecone fails

rag_service = RAGService()
