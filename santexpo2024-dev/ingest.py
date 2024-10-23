from langchain_community.document_loaders import PyPDFDirectoryLoader
from transformers import AutoTokenizer, AutoModel
import random
from langchain_community.vectorstores import FAISS
from src.constant import *
from langchain.text_splitter import RecursiveCharacterTextSplitter
from utils import get_embeddings

pdf_folder_path = 'pdf_all'
loader = PyPDFDirectoryLoader(pdf_folder_path)
transcript = loader.load()

# Modifier le nom de la source et la page dans les métadonnées
for doc in transcript:
    doc.metadata['source'] = doc.metadata['source'].split('\\')[-1]
    doc.metadata['page'] = int(doc.metadata['page']) + 1

tokenizer = AutoTokenizer.from_pretrained(EMBEDDING_MODEL_NAME)

# max_context_length = tokenizer.model_max_length
max_context_length = 512

print(f"Maximum context length: {max_context_length}")

chunk_size = max_context_length  # Max Number of token for the embedding model
# chunk_size = 512  # Max Number of token for the embedding model

text_splitter = RecursiveCharacterTextSplitter.from_huggingface_tokenizer(
    tokenizer,
    chunk_size=chunk_size,
    chunk_overlap=int(chunk_size / 10))

chunks = text_splitter.split_documents(transcript)

print('splitted')

# Generate a random index between 0 and the length of the chunks list
random_index = random.randint(0, len(chunks) - 1)

# Print the randomly selected chunk
print(chunks[random_index])

embeddings = get_embeddings()
# embeddings = FakeEmbeddings(size=1352)


print((f"Loaded embeddings from {EMBEDDING_MODEL_NAME}"))

# embedding_fn = OpenAIEmbeddings(openai_api_key=os.getenv("OPENAI_API_KEY"))


db = FAISS.from_documents(chunks,
                          embeddings,
                          )

db.save_local(folder_path=PERSIST_DIRECTORY)

print(db.index.ntotal)
#alert()
