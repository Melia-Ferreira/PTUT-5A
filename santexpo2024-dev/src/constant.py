import os
from langchain.chat_models.openai import ChatOpenAI
from dotenv import load_dotenv
import torch

load_dotenv()  # load environment variables from .env file

ovh_token = os.getenv('OVH_TOKEN')

hf_token = os.environ["HF_TOKEN"]

EMBEDDING_MODEL_NAME = "OrdalieTech/Solon-embeddings-large-0.1"

ROOT_DIRECTORY = os.path.dirname(os.path.realpath(__file__))
# path = os.getcwd()
# PROJECT_DIRECTORY= path.replace("\\", "/")


# Define the folder for storing database
SOURCE_DIRECTORY = f"{ROOT_DIRECTORY}/pdf_sub_base"

PERSIST_DIRECTORY = f"{ROOT_DIRECTORY}/DB"