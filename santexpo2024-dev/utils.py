from src.constant import *
# from langchain_community.embeddings import HuggingFaceInstructEmbeddings
# from langchain_community.embeddings import HuggingFaceBgeEmbeddings
from langchain_community.embeddings import HuggingFaceEmbeddings
import sentence_transformers
import torch
from dotenv import load_dotenv
# import winsound

load_dotenv()

# Créer la connexion vers le proxy
import os
os.environ['http_proxy'] = os.getenv('http_proxy')
os.environ['https_proxy'] = os.getenv('http_proxy')
import requests
requests.get("http://google.com")


# # ## Supprimer la connexion vers le proxy
# if 'http_proxy' in os.environ:
#     del os.environ['http_proxy']
# if 'https_proxy' in os.environ:
#     del os.environ['https_proxy']

"""Retourne le périphérique à utiliser pour les calculs (GPU ou CPU)."""
if torch.cuda.is_available():
    # Si le GPU est disponible
    device = torch.device('cuda')
    # print("cuda")
else:
    # Sinon, utilisez le CPU
    device = torch.device('cpu')
    # print("cpu")


def embed_text(text, embeddings):
    return embeddings.embed_query(text)



def get_embeddings():
    return HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL_NAME,
        model_kwargs={"device": device},
        encode_kwargs={'normalize_embeddings': False}
    )