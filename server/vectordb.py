from langchain.document_loaders import TextLoader
from langchain.text_splitter import MarkdownHeaderTextSplitter
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.vectorstores import Chroma
from langchain.embeddings.openai import OpenAIEmbeddings
import dotenv
import os
from pathlib import Path
from time import time


dotenv.load_dotenv()

OPENAI_KEY = os.environ.get("OPENAI_API_KEY")


class VectorDB:
    def __init__(
        self,
        file_path,
        chunk_size=1500,
        chunk_overlap=150,
        persist_directory="./docs/chroma/",
        openai_api_key=None,
    ):
        self.file_path = file_path
        self.file_name = os.path.basename(file_path)
        self.headers_to_split_on = [
            ("#", "Header 1"),
            ("##", "Header 2"),
            ("###", "Header 3"),
            ("####", "Header 4"),
        ]
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.persist_directory = persist_directory
        self.openai_api_key = openai_api_key

    def create_vector_db(self):
        text = Path(self.file_path).read_text()

        markdown_splitter = MarkdownHeaderTextSplitter(
            headers_to_split_on=self.headers_to_split_on
        )
        md_header_splits = markdown_splitter.split_text(text)

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size, chunk_overlap=self.chunk_overlap
        )
        splits = text_splitter.split_documents(md_header_splits)

        embedding = OpenAIEmbeddings(openai_api_key=self.openai_api_key)

        vectordb = Chroma.from_documents(
            documents=splits,
            embedding=embedding,
            persist_directory=self.persist_directory,
            collection_name=self.file_name,
        )

        vectordb.persist()
        return vectordb


if __name__ == "__main__":
    
    
    

    # Your code
    p = "./server/files/sample_paper/A_19_2022_DoHonestyNudges.mmd"

    print("path:", p)
    print("basename:", os.path.basename(p))
    query = "What did the president say about Ketanji Brown Jackson"
    # load from disk
    start_time = time()  # Reset the start time

    db3 = Chroma(
        persist_directory="./docs/chroma/",
        embedding_function=OpenAIEmbeddings(openai_api_key=OPENAI_KEY),
        collection_name=os.path.basename(p),
    )
    docs2 = db3.similarity_search(query)
    # print(docs2[0].page_content)

    # Calculate time for the second section
    section2_time = time() - start_time
    print("Time taken for the second section:", section2_time, "seconds")

    start_time = time()
    vectordb = VectorDB(
        file_path=p,
        openai_api_key=OPENAI_KEY,
    )

    v1 = vectordb.create_vector_db()
    docs = v1.similarity_search(query)
    # print(docs[0].page_content)

    # Calculate time for the first section
    section1_time = time() - start_time
    print("Time taken for the first section:", section1_time, "seconds")

    
