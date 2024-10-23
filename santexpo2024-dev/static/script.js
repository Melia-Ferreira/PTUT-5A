const chatInput = document.querySelector("#chat-input");
const sendButton = document.querySelector("#send-btn");
const chatContainer = document.querySelector(".chat-container");
const themeButton = document.querySelector("#theme-btn");
const deleteButton = document.querySelector("#delete-btn");
const uuid=crypto.randomUUID();
let userText = null;
var source;

// Version Appel RAG serveur Python
// Autor : @capdecomme
// Date : 25/04/2024
function sseevent(message) {
  let type = 'message', start = 0;
  if (message.startsWith('event: ')) {
    start = message.indexOf('\n');
    type = message.slice(7, start);
  }
  start = message.indexOf(': ', start) + 2;
  let data = message.slice(start, message.length);

  return new MessageEvent(type, {data: data})
}
// sse-post : https://solovyov.net/blog/2023/eventsource-post/
function XhrSource(url, opts) {
  const eventTarget = new EventTarget();
  const xhr = new XMLHttpRequest();

  xhr.open(opts.method || 'GET', url, true);
  for (var k in opts.headers) {
    xhr.setRequestHeader(k, opts.headers[k]);
  }

  var ongoing = false, start = 0;
  xhr.onprogress = function() {
    if (!ongoing) {
      // onloadstart is sync with `xhr.send`, listeners don't have a chance
      ongoing = true;
      eventTarget.dispatchEvent(new Event('open', {
        status: xhr.status,
        headers: xhr.getAllResponseHeaders(),
        url: xhr.responseUrl,
      }));
    }

    var i, chunk;
    while ((i = xhr.responseText.indexOf('\n\n', start)) >= 0) {
      chunk = xhr.responseText.slice(start, i);
      start = i + 2;
      if (chunk.length) {
        eventTarget.dispatchEvent(sseevent(chunk));
      }
    }
  }

  xhr.onloadend = _ => {
    eventTarget.dispatchEvent(new CloseEvent('close'))
  }

  xhr.timeout = opts.timeout;
  xhr.ontimeout = _ => {
    eventTarget.dispatchEvent(new CloseEvent('error', {reason: 'Network request timed out'}));
  }
  xhr.onerror = _ => {
    eventTarget.dispatchEvent(new CloseEvent('error', {reason: xhr.responseText || 'Network request failed'}));
  }
  xhr.onabort = _ => {
    eventTarget.dispatchEvent(new CloseEvent('error', {reason: 'Network request aborted'}));
  }

  eventTarget.close = _ => {
    xhr.abort();
  }

  xhr.send(opts.body);
  return eventTarget;
}

const loadDataFromLocalstorage = () => {
    // Charge l'historique des échanges depuis localStorage
    const themeColor = localStorage.getItem("themeColor");
    document.body.classList.toggle("light-mode", themeColor === "light_mode");
    themeButton.innerText = document.body.classList.contains("light-mode") ? "dark_mode" : "light_mode";
    const defaultText = `<div class="default-text">
                            <h1><span class="titreIA">OK</span>MipihSib</h1>
                            <p>Démarrez une conversation et explorez la puissance de notre IA<br> L'historique des discussions sera accessible ici</p>
                            <p style="color:gray;font-size:11px;font-style: italic;">Version Api Ollama Chat avec retour SSE</p>
                        </div>`
    chatContainer.innerHTML = localStorage.getItem("all-chats") || defaultText;
    chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll vers le bas du conteneur de discussion
}
const createChatElement = (content, className) => {
    // Nouveau div ajouté au dernier message 
    const chatDiv = document.createElement("div");
    chatDiv.classList.add("chat", className);
    chatDiv.innerHTML = content;
    return chatDiv; // Return le nouveau div
}


// function decodeStreamArray(uInt8Array) {
//   // Le tableau d'octets, une fois décodé en string, peut contenir plusieurs éléments "data:  (...)".
//   // On prend la valeur associée à la dernière occurrence de "data:", car c'est la + récente/complète.
//   const rawString = new TextDecoder().decode(uInt8Array);
//   const arr = rawString.split('data:  ');
//   const s = arr[arr.length-1].trim();
//   return s;
// }

function decodeStreamArray(uInt8Array) {
  const rawString = new TextDecoder().decode(uInt8Array);
  const arr = rawString.split('data:  ');
  const s = arr[arr.length - 1].trim();

  // Rechercher les occurrences de noms de fichiers pdf et les remplacer par des balises d'ancrage
  const pdfRegex = /(([\w-]+\.pdf)\b)/g;
  const replacedText = s.replace(pdfRegex, '<a href="/pdf/$1" target="_blank">$1</a>');

  return replacedText;
}

  
const getChatResponse = async (incomingChatDiv) => {
    console.log("Pose une question : " + userText);
	// Url serveur python : http://localhost:5000/chat
    const API_URL = "chat";
    const pElement = document.createElement("p");
    
    incomingChatDiv.querySelector(".typing-animation").remove();
    incomingChatDiv.querySelector(".chat-details").appendChild(pElement);

  	// Get the div element
	let divElement = document.getElementById('chat-container');
		
	data="{\"new_message\": \""+userText+"\"}";	
		
  try {
    const response = await fetch("/chat",{
      method: 'POST',
      mode: "cors",
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: data
    }).catch((error) => {
      return {error};
    });
    if (response.error) {
      throw new Error(response.error);
    }
    isResponseInProgress = true;
    const reader = response.body.getReader();
    var nbChunks = 0;
    var str;
    var maxLength = 0;
    while (true) {
      const {value, done} = await reader.read();
      nbChunks++;
      if (done) break;
      str = decodeStreamArray(value);
      if (str.length > maxLength) {
        maxLength = str.length;
          
        if (str && str != undefined) {
        pElement.innerHTML = str;

        // Sélectionner tous les liens dans pElement
        const links = pElement.querySelectorAll('a');

        // Ajouter un gestionnaire d'événements pour chaque lien
        links.forEach((link) => {
          link.addEventListener('click', (event) => {
            event.preventDefault();
            const win = window.open(link.href, '_blank');
            if (win) {
              win.focus();
            } else {
              alert('Veuillez autoriser les pop-ups pour ce site');
            }
          });
        });

        if (str.includes("#FIN#")) {
          console.log("Fin du stream");
          const responseContent = str.split("#FIN#")[0].trim();
          const sourcesContent = responseContent.match(/<br>Sources : (.*)/);
          if (sourcesContent) {
              const sourcesElement = document.createElement("p");
              sourcesElement.textContent = sourcesContent[1];
              incomingChatDiv.querySelector(".chat-details").appendChild(sourcesElement);
              responseContent = responseContent.replace(/<br>Sources : (.*)/, "").trim();
          }
          pElement.innerHTML = responseContent;
          // sauve dans localStorage et ferme la source
          localStorage.setItem("all-chats", chatContainer.innerHTML);
          chatContainer.scrollTo(0, chatContainer.scrollHeight);
          source.close();
      }      
       else {
            console.log("Message recu : ["+ str + "]");
            pElement.innerHTML = str;
          // Scroll en bas du div
          divElement.scrollTop = divElement.scrollHeight;
        }
      }
      }
    }
    //console.log('nbChunks='+nbChunks);
    // return await Promise.resolve(str);
  } catch (e) {
    // return await Promise.reject(e);
    console.log("Message Erreur recu : ["+ e.data + "]");
	  pElement.innerHTML += 'ERROR: ' + e.reason;
  } finally {
    isResponseInProgress = false;
    hasUserScrolled = false;
  }

	
	// xs.addEventListener('close', e => {
  //   	console.log("Message Close recu : ["+ e.data + "]");
	// 	// sauve dans localStorage et ferme la source
	//     localStorage.setItem("all-chats", chatContainer.innerHTML);
	//     chatContainer.scrollTo(0, chatContainer.scrollHeight);
	// 	xs.close();
	// });
	
	// xs.addEventListener('message', e => {
  //   	console.log("Message recu : ["+ e.data + "]");
  //   	if (e.data && e.data != undefined) {
	// 		if (e.data == "#FIN#") {
  //   			console.log("Fin du stream");
	// 			// sauve dans localStorage et ferme la source
	// 		    localStorage.setItem("all-chats", chatContainer.innerHTML);
	// 		    chatContainer.scrollTo(0, chatContainer.scrollHeight);
	// 			source.close();
	// 		} else {
	// 	  		pElement.innerHTML += e.data;
	// 			// Scroll en bas du div
	// 			divElement.scrollTop = divElement.scrollHeight;
	// 		}
	// 	}
	// });
    
    // Supprime l'animation de saisie, ajoute l'élément de paragraphe et enregistre les discussions sur le stockage local
    
}

const copyResponse = (copyBtn) => {
    // Copie le contenu textuel de la réponse dans le presse-papiers
    const reponseTextElement = copyBtn.parentElement.querySelector("p");
    navigator.clipboard.writeText(reponseTextElement.textContent);
    copyBtn.textContent = "done";
    setTimeout(() => copyBtn.textContent = "content_copy", 1000);
}
const showTypingAnimation = () => {
    // Affiche l'animation de saisie et appelle la fonction getChatResponse
    const html = `<div class="chat-content">
                    <div class="chat-details">
                    <img src="img/chatbot.jpg" alt="chatbot-img">
                        <div class="typing-animation">
                            <div class="typing-dot" style="--delay: 0.2s"></div>
                            <div class="typing-dot" style="--delay: 0.3s"></div>
                            <div class="typing-dot" style="--delay: 0.4s"></div>
                        </div>
                    </div>
                    <span onclick="copyResponse(this)" class="material-symbols-rounded">content_copy</span>
                </div>`;
    // Créé un div de chat entrant avec une animation de saisie et ajoute-le au conteneur de chat
    const incomingChatDiv = createChatElement(html, "incoming");
    chatContainer.appendChild(incomingChatDiv);
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
    getChatResponse(incomingChatDiv);
}
const handleOutgoingChat = () => {
	if (source != undefined) {
		source.close();
	}
    userText = chatInput.value.trim(); // récupere la question sans les espaces
    if(!userText) return; // Si question vide, on sort
    // Efface le champ de saisie et réinitialise sa hauteur
    chatInput.value = "";
	chatInput.style.height = `${initialInputHeight}px`;
    const html = `<div class="chat-content">
                    <div class="chat-details">
                        <img src="img/user.png" alt="user-img">
                        <p>${userText}</p>
                    </div>
                </div>`;
    // Créé un div de discussion sortant avec le message de l'utilisateur et ajoute au conteneur de discussion
    const outgoingChatDiv = createChatElement(html, "outgoing");
    chatContainer.querySelector(".default-text")?.remove();
    chatContainer.appendChild(outgoingChatDiv);
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
    setTimeout(showTypingAnimation, 500);
}
deleteButton.addEventListener("click", () => {
    // Supprime les discussions du stockage local et appele la fonction loadDataFromLocalstorage
    if(confirm("Voulez-vous supprimer tous les chats ?")) {
        localStorage.removeItem("all-chats");
        loadDataFromLocalstorage();
    }
});
themeButton.addEventListener("click", () => {
     // Change le thème et l''enregistre dans le stockage local 
    document.body.classList.toggle("light-mode");
    localStorage.setItem("themeColor", themeButton.innerText);
    themeButton.innerText = document.body.classList.contains("light-mode") ? "dark_mode" : "light_mode";
});

const initialInputHeight = chatInput.scrollHeight;
console.log(initialInputHeight);
chatInput.addEventListener("input", () => {   
    // Ajuste la hauteur du champ de saisie de manière dynamique en fonction de son contenu
    // A revoir si question sur 2 lignes
    chatInput.style.height =  `${initialInputHeight}px`;
    chatInput.style.height = `${chatInput.scrollHeight}px`;
});
chatInput.addEventListener("keydown", (e) => {

		
    // Si la touche Entrée est enfoncée sans Shift et que la largeur de la fenêtre est plus grande
    // que 800 pixels, gère le chat sortant
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
        e.preventDefault();
        handleOutgoingChat();
    }
});
loadDataFromLocalstorage();
sendButton.addEventListener("click", handleOutgoingChat);