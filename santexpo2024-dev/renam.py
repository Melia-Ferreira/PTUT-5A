import os
import shutil

# Chemin vers le dossier contenant les PDF
folder_path = 'pdf_all'

# Liste tous les fichiers dans le dossier
for filename in os.listdir(folder_path):
    # Vérifie si le fichier est un PDF
    if filename.endswith('.pdf'):
        # Chemin complet du fichier
        file_path = os.path.join(folder_path, filename)
        # Nouveau nom de fichier
        new_filename = filename.replace('_', '-')
        # Nouveau chemin du fichier
        new_file_path = os.path.join(folder_path, new_filename)
        # Renomme le fichier
        shutil.move(file_path, new_file_path)
