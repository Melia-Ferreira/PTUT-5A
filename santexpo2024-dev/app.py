from flask import Flask, render_template, request, jsonify, stream_template, Response, send_from_directory, abort
from rag import chat_completion
import os

#je comprends rien
app = Flask(__name__, static_url_path='', static_folder='static')


# Nouvelle route pour servir les fichiers PDF
@app.route('/pdf/<filename>', methods=['GET'])
def send_pdf(filename):
    if filename != '':
        directory = 'pdf_all'
        return send_from_directory(directory, filename)
    else:
        abort(404)

@app.route("/", methods=['GET'])
def index():
    return render_template('index.html')


@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    new_message = data.get('new_message')
    print(new_message)
    history = data.get('history') or []
    generator = chat_completion(new_message, history)

    def generate():
        first_value = next(generator)
        yield '{}\n\n'.format(first_value)
        for value in generator:
            yield '{}\n\n'.format(value)


    response = Response(generate(), mimetype='text/event-stream')
    return response



if __name__ == '__main__':
    app.run()