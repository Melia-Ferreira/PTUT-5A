from src.constant import *
from openai import OpenAI
from utils import *
from langchain_community.vectorstores import FAISS
import random
import time
import sys
import os
import numpy as np
import html

### Charger le modèle d'embedding  qui est dans le fichier utils.py
embeddings = get_embeddings()
print((f"Chargement des embeddings à partir de {EMBEDDING_MODEL_NAME}"))

### Charger la base de données vectorielle qui est présente dans dans le dossier de la variable PERSIST_DIRECTORY (constant.py)
db = FAISS.load_local(PERSIST_DIRECTORY, embeddings, allow_dangerous_deserialization='True')
retriever = db.as_retriever()
print((f"Chargement de la BD vectorielle avec {db.index.ntotal} documents"))

## Supprimer la connexion vers le proxy
if 'http_proxy' in os.environ:
    del os.environ['http_proxy']
if 'https_proxy' in os.environ:
    del os.environ['https_proxy']


### Initialiser le client OpenAI 
client = OpenAI(base_url="http://localhost:1234/v1", api_key="lm-studio") #LM Studio
# client = OpenAI(base_url='http://localhost:11434/v1', api_key='ollama') #Ollama
print((f"Client initialisé"))

# ### Fonction qui prend une requête en entrée et renvoie une liste de documents pertinents pour cette requête
# def retrieve_context(query):
#     # Retrieve the relevant documents from the FAISS DB
#     Nb_of_chunks_for_context = 7

#     return db.similarity_search(query, k=Nb_of_chunks_for_context)


def retrieve_context_with_score(query):
    # Retrieve the relevant documents from the FAISS DB
    Nb_of_chunks_for_context = 7

    search_results = db.similarity_search_with_relevance_scores(query, k=Nb_of_chunks_for_context)

    # Initialisez deux listes vides pour stocker les documents et les scores
    results = []
    scores = []

    # Parcourez la liste de tuples
    for doc, score in search_results:
        # Ajoutez le document à la liste results
        results.append(doc)
        # Ajoutez le score à la liste scores
        scores.append(score)

    print(scores)
    return results, scores
    
def filter_results(query):

    results, scores = retrieve_context_with_score(query)

    max_score = scores[0]

    if max_score < 0.19:
        return results[0], max_score
    
    results, scores = zip(*[(r, s) for r, s in zip(results, scores) if s >= 0.19])

    moyenne = np.mean(scores)

    # Sélectionnez les scores qui sont proches du score maximum en fonction de l'écart type
    close_scores = [s for s in scores if s >= moyenne]

    # Filtrer les résultats associés aux scores sélectionnés
    filtered_results = [r for r, s in zip(results, scores) if s in close_scores]

    # Afficher les résultats
    print("Moyenne :", moyenne)
    print("Scores proches du maximum :", close_scores)
    return filtered_results, max_score


def chat_completion(new_message, history):

    # results, scores = retrieve_context_with_score(new_message)

    results, max_score = filter_results(new_message)

    if max_score < 0.19:
        str = "Désolé, je ne suis pas en capacité de répondre à cela. Merci de me poser une question en lien avec les Ressources Humaines."
        yield str
        return

    ### Demander au modèle de n'utiliser que les informations transmises dans le contexte et de répondre en français
    instruction = "<s>[INST] Vous êtes un assistant spécialisé dans le domaine des ressources humaines, dont le rôle est de fournir " \
                  "des recommandations fondées sur la documentation sur la Fonction Publique Hospitalière. Cependant, " \
                  "si l'utilisateur engage une conversation légère, vous devez répondre de manière appropriée pour " \
                  "maintenir une conversation agréable et polie. Veuillez noter " \
                  "que toutes les informations doivent être fournies en langue française et doivent être étayées par " \
                  "des preuves scientifiques ou des références à des informations de ressources humaines dans le contexte. " \
                  "Il est essentiel de porter une attention particulière aux informations fournies dans la question, " \
                  "car elles seront cruciales pour répondre de manière précise, complète et conforme par rapport aux " \
                  "informations de ressources humaines du contexte. Si la réponse à la question n'est pas présente dans le contexte, " \
                  "vous devez répondre 'Je ne sais pas' au lieu d'inventer ou de fournir des informations qui ne sont " \
                  "pas pertinentes ou qui ne sont pas étayées par le contexte. [/INST]</s> "
    
    ### Formatage des documents pertinents sous forme de chaînes de contexte avec des informations sur la source
    instruction_openai_format = []
    instruction_openai_format.append({"role": "system", "content": instruction})

    query_openai_format = []
    query_openai_format.append({"role": "user",
                                 "content": f"<s>Veuillez utiliser exclusivement les informations contenues dans les "
                                            f"sources documentaires fournies dans le contexte pour élaborer "
                                            f"une réponse complète et structurée à la question suivante :\n"
                                            f"{new_message}.\n Vous devez répondre uniquement et obligatoirement en langue française."
                                            f"[/INST]</s>"})

    sources_strings = []
    context_strings = []
    for doc in results:
        source_info = f"{doc.metadata['source']}, Page: {doc.metadata['page']}"
        sources_strings.append(f"{source_info}")
        context_strings.append(f"<s>Context: {doc.page_content}</s>")

    context_openai_format = []
    for context in context_strings:
        ### Ajouter un message utilisateur fictif avant chaque chaîne de contexte
        context_openai_format.append({"role": "user", "content": context})

    msg = instruction_openai_format + context_openai_format + query_openai_format

    ### Générer une réponse du modèle
    response = client.chat.completions.create(model='Publisher/Repository', messages=msg, temperature=0.01, stream=True, seed=31) #LM Studio
    # response = client.chat.completions.create(model='mistral', messages=complete_message_openai_format, temperature=0.01, stream=True) #Ollama

    string = '\n'.join(sources_strings)
    partial_message = ""
    for chunk in response:
        if chunk.choices[0].delta.content is not None:
            partial_message = partial_message + chunk.choices[0].delta.content
            yield partial_message

    if string:
        string_html = html.escape(string)
        partial_message += "<br>\nSources : \n" + string_html
    yield partial_message