let user = null;
let horde_url = "https://stablehorde.net/api"
let model_reference_url = "https://raw.githubusercontent.com/Haidra-Org/AI-Horde-image-model-reference/main/stable_diffusion.json"

let token = "0000000000";

let horde_models = null;


const userNameText = document.getElementById("userName");
const modelDropdown = document.getElementById("model-name");

const progress_container = document.getElementById("progress_container");
const queue_container = document.getElementById("queue_container");
const queue_number = document.getElementById("queue_number");
const progress_bar = document.getElementById("progress_bar");
const progress_bar_progress = document.getElementById("progress_bar_progress");
const states_container = document.getElementById("states_container");
const waitingNumber = document.getElementById("waitingNumber");
const processingNumber = document.getElementById("processingNumber");
const finishedNumber = document.getElementById("finishedNumber");
const horde_loraContainer = document.getElementById("horde_loraContainer");
const loraCount = document.getElementById("loraCount");
const tokenAmount = document.getElementById("tokenAmount");

let horde_loras = [];

let nextPage = null;

let horde_status = {
    "finished": 0,
    "processing": 0,
    "restarted": 0,
    "waiting": 0,
    "done": false,
    "faulted": false,
    "wait_time": 0,
    "queue_position": 0,
    "kudos": 0,
    "is_possible": true
};

current_id = 0;

generations = [];

function UpdateHorde() {
    UpdateUser();
    getHordeModels();
}

function UpdateUser() {

    const headers = {
        'apikey': token, // Replace with your API key
    };

    fetch(`${horde_url}/v2/find_user`, {
        method: 'GET',
        headers: headers
    }).then(response => response.json())
        .then(data => {
            // Handle the data returned from the API
            console.log(data);
            user = data;
            userNameText.textContent = user.username
            tokenAmount.textContent = user.kudos
        })
        .catch(error => {
            // Handle errors
            console.error('Error:', error);
            userNameText.textContent = "Invalid AIHorde Token"
        });
}

function getHordeModels() {
    fetch(`${horde_url}/v2/status/models`, {
        method: 'GET',
    }).then(response => response.json())
        .then(data => {
            // Handle the data returned from the API


            fetch(model_reference_url).then(response => response.json()).then(reference => {

                data.sort((a, b) => b.count - a.count); // Sort the data array by count
                let models = {};
                data.forEach(model => {

                    if (reference[model.name]) {
                        models[model.name] = reference[model.name];
                        models[model.name].count = model.count;
                        models[model.name].jobs = model.jobs;
                    } else {
                        models[model.name] = model;
                    }

                });
                horde_models = models;
                console.log(horde_models);

                document.getElementById("modelList").innerHTML = "";
                Object.keys(horde_models).forEach(key => {
                    addModelToList(key);
                })

                modelDropdown.innerHTML = "";
                Object.keys(horde_models).forEach(key => {
                    modelDropdown.innerHTML += `<option value="${key}">${key} (${horde_models[key].count})</option>`;
                })
            })
        })
        .catch(error => {
            // Handle errors
            console.error('Error:', error);
        })
}


function showModelDisplay(_model) {
    model = horde_models[_model];

    modelDropdown.value = _model;

    img_url = "";
    if (model.showcases) {
        img_url = model.showcases[0];
    }
    updateModelDisplay(model.name, model.homepage, model.jobs, model.style, model.version, model.description, img_url, model.count);
}

function addModelToList(modelName) {
    const modelList = document.getElementById('modelList');
    const modelItem = document.createElement('li');
    modelItem.className = 'cursor-pointer hover:text-blue-500 horde_model';
    modelItem.textContent = modelName;

    modelItem.addEventListener('click', () => {
        showModelDisplay(modelName);
    })

    modelList.appendChild(modelItem);
}


function updateModelDisplay(name, homepageLink, RequestsAmount, style, versionNumber, description, imageSrc, workersAmount) {
    const modelName = document.getElementById('horde_modelName');
    const homepage = document.getElementById('horde_homepageLink');
    const workers = document.getElementById('horde_workersAmount');
    const requests = document.getElementById('horde_requestsAmount');
    const modelStyle = document.getElementById('horde_style');
    const version = document.getElementById('horde_versionNumber');
    const modelDescription = document.getElementById('horde_description');
    const modelImage = document.getElementById('horde_image');

    modelName.textContent = name || "";
    homepage.href = homepageLink || "";
    requests.textContent = RequestsAmount || 0;
    workers.textContent = workersAmount || 0;
    modelStyle.textContent = style || "?";
    version.textContent = versionNumber || "?";
    modelDescription.textContent = description || "";
    modelImage.src = imageSrc;


    console.log('Model information updated:', {
        name, homepageLink, workersAmount, style, versionNumber, description, imageSrc
    });
}
function GenerateHorde() {
    max_wait_time = 0;
    progress_container.classList.remove("hidden");
    document.getElementById("outputImage").classList.add("blur");
    document.getElementById("imgButtons").classList.add("blur");

    payload = {
        "prompt": promptField.value.replaceAll("###", "") + "###" + negativePromptField.value,
        "params": {
            "sampler_name": samplerDropdown.value,
            "cfg_scale": parseFloat(cfgSlider.value),
            "width": parseInt(width),
            "height": parseInt(height),
            "steps": parseInt(stepsSlider.value),
            "n": parseInt(batchSizeSlider.value),
            "loras": horde_loras
        },
        "nsfw": document.getElementById("allowNSFW").checked,
        "slow_workers": document.getElementById("slowWorkers").checked,
        "models": [modelDropdown.value],
        "r2": false //use base64 instead of links
    }
    if (uploadedImageBase64 != "") {
        payload["source_image"] = uploadedImageBase64;
        payload["params"]["denoising_strength"] = parseFloat(weightSlider.value);

        if (maskImageBase64 != "") {
            payload["source_mask"] = maskImageBase64;
            payload["source_processing"] = "inpainting";
        }
    }


    //add seed if specifed
    if (parseInt(seedDropdown.value) != -1 && seedDropdown.value) {
        payload["params"]["seed"] = seedDropdown.value;
    }
    console.log(JSON.stringify(payload, null, 2));

    fetch(`${horde_url}/v2/generate/async`, {
        method: 'POST',
        headers: {
            'apikey': token,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    }).then(response => {
        if (!response.ok) {
            showMessage(response.error);
            throw new Error('Request failed');
        }
        return response.json();
    }).then(data => {
        current_id = data.id;
        console.log(data);
        checkGenerationStatus();
    })

}

let max_wait_time = 0;
function checkGenerationStatus() {

    progress_bar.classList.remove("hidden");


    fetch(`${horde_url}/v2/generate/check/${current_id}`, {
        method: 'GET',
    }).then(response => {
        if (!response.ok) {
            showMessage(response.error);
            throw new Error('Request failed');
        }
        return response.json();
    }).then(data => {
        console.log(data);
        horde_status = data;

        if (horde_status["done"] == true) {
            console.log("done");
            OnGenerationFinished();
        } else {

            if (horde_status["wait_time"] > max_wait_time) {
                max_wait_time = horde_status["wait_time"];
            }
            let percentage = 100 - (horde_status["wait_time"] / max_wait_time * 100);

            progress_bar_progress.style.width = percentage + "%";
            progress_bar_progress.textContent = horde_status["wait_time"] + "s";

            if (horde_status["queue_position"] != 0) {
                queue_container.classList.remove("hidden");
                states_container.classList.add("hidden");
                queue_number.textContent = horde_status["queue_position"];
            } else {
                queue_container.classList.add("hidden");
                states_container.classList.remove("hidden");

                waitingNumber.textContent = horde_status["waiting"];
                processingNumber.textContent = horde_status["processing"];
                finishedNumber.textContent = horde_status["finished"];
            }

            setTimeout(checkGenerationStatus, 1000);
        }
    })
}

function OnGenerationFinished() {




    fetch(`${horde_url}/v2/generate/status/${current_id}`, {
        method: 'GET',
    }).then(response => {
        if (!response.ok) {
            showMessage(response.error);
            throw new Error('Request failed');
        }
        return response.json();
    }).then(data => {
        console.log(data);
        generations = data["generations"];


        const imageDisplay = document.getElementById('outputImage');

        generatedImages = [];

        generations.forEach(generation => {
            const imageURL = `data:image/png;base64, ${generation["img"]}`;
            generatedImages.push(imageURL);
        });
        imageDisplay.src = generatedImages[0].toString();

        progress_container.classList.add("hidden");
        progress_bar.classList.add("hidden");
        document.getElementById("outputImage").classList.remove("blur");
        document.getElementById("imgButtons").classList.remove("blur");

        updateFullscreenImage(generatedImages[0].toString());
        const imgButtonContainer = document.getElementById("imgButtons");
        imgButtonContainer.innerHTML = "";

        i = 0;

        generatedImages.forEach((imageSrc, index) => {



            if (document.getElementById("saveToHistory").checked) {

                text = payload.prompt.split("###")[0] + "\n";
                text += "Negative prompt:" + payload.prompt.split("###")[1] + "\n";
                text += "Steps:" + payload.params.steps + ", ";
                text += "Size:" + payload.params.width + "x" + payload.params.height + ", ";
                text += "Seed:" + generations[i].seed;
                text += "Model:" + generations[i].model + ", ";
                text += "Sampler:" + payload.params.sampler_name + ", ";
                text += "CFG scale:" + payload.params.cfg_scale + ", ";
                text += "Worker:" + generations[i]["worker_name"] + ", ";
                text += "Id:" + generations[i]["id"];


                addToImageHistory(imageSrc, text);
            }


            // Create the image button
            const imageButton = document.createElement('img');
            imageButton.src = imageSrc;
            imageButton.alt = `Image ${index + 1}`;
            imageButton.classList.add('w-12', 'h-12', 'border', 'border-gray-500', 'rounded-md', 'cursor-pointer', 'mr-2');

            // Add click event listener to the image button
            imageButton.addEventListener('click', () => {
                imageDisplay.src = imageSrc;
                updateFullscreenImage(imageSrc);
            });

            // Append the image button to the container
            imgButtonContainer.appendChild(imageButton);

            i++;
        });
    })
}


function AddLora(name, id) {
    const horde_loraContainer = document.getElementById('horde_loraContainer');

    const loraDiv = document.createElement('div');
    loraDiv.classList.add('border-gray-700', 'border', 'rounded', 'flex', 'items-center', 'p-4');

    const innerDiv = document.createElement('div');
    innerDiv.classList.add('w-full');

    const flexDiv = document.createElement('div');
    flexDiv.classList.add('flex', 'justify-between', 'items-center');

    const h1 = document.createElement('h1');
    h1.classList.add('text-xl', 'font-bold', 'mb-2', 'text-white');
    h1.textContent = name;

    const button = document.createElement('button');
    button.classList.add('bg-red-500', 'hover:bg-red-700', 'text-white', 'font-bold', 'py-2', 'px-4', 'rounded', 'mt-4');
    const icon = document.createElement('i');
    icon.classList.add('fa-solid', 'fa-trash-can');
    button.appendChild(icon);

    button.addEventListener('click', function () {
        horde_loraContainer.removeChild(loraDiv);
        horde_loras = horde_loras.filter(lora => lora.name !== id.toString());
        loraCount.textContent = horde_loras.length + "/5";
        console.log(horde_loras);
    })

    const label = document.createElement('label');
    label.classList.add('text-white', 'block', 'mb-1');
    label.setAttribute('for', 'strength');
    label.textContent = 'Strength: 1';

    const input = document.createElement('input');
    input.setAttribute('type', 'range');
    input.setAttribute('id', 'lora_strength_' + id);
    input.setAttribute('name', 'strength');
    input.classList.add('block', 'w-full', 'mt-1');
    input.setAttribute('min', '-5');
    input.setAttribute('max', '5');
    input.setAttribute('step', '0.05');
    input.setAttribute('value', '1');

    input.addEventListener('input', function () {
        label.textContent = 'Strength: ' + input.value;
        horde_loras.find(lora => lora.name === id.toString()).model = parseFloat(input.value);
    })

    // Assemble the elements
    flexDiv.appendChild(h1);
    flexDiv.appendChild(button);
    innerDiv.appendChild(flexDiv);
    innerDiv.appendChild(label);
    innerDiv.appendChild(input);
    loraDiv.appendChild(innerDiv);

    horde_loraContainer.appendChild(loraDiv);
}




document.getElementById("listButton").addEventListener("click", () => {
    document.getElementById("modelModal").classList.remove("hidden");
    showModelDisplay(modelDropdown.value);
})
document.getElementById("tokenInput").addEventListener("change", () => {
    token = document.getElementById("tokenInput").value
    UpdateUser();
    SaveState();
})
document.getElementById("horde_search").addEventListener('input', (e) => {
    const elements = document.querySelectorAll(".horde_model");
    elements.forEach(element => {
        if (element.textContent.toLowerCase().includes(e.target.value.toLowerCase())) {
            element.classList.remove("hidden");
        } else {
            element.classList.add("hidden");
        }
    });
});

function horde_addLoraEntry(imageSrc, name, user, id) {
    // Create the necessary HTML elements
    const entryDiv = document.createElement('div');
    entryDiv.classList.add('group', 'relative', 'lora');
    entryDiv.id = id;

    const imageDiv = document.createElement('div');
    imageDiv.classList.add(
        'aspect-h-1', 'aspect-w-1', 'w-full', 'overflow-hidden', 'rounded-md',
        'bg-gray-200', 'lg:aspect-none', 'group-hover:opacity-75', 'lg:h-100'
    );

    const image = document.createElement('img');
    image.src = imageSrc;
    image.alt = 'Lora Thumbnail';
    image.classList.add(
        'aspect-w-2', 'aspect-h-3', 'object-cover', 'object-center'
    );
    image.onerror = function () {
        image.src = "img/card-no-preview.png";
    }


    const infoDiv = document.createElement('div');
    infoDiv.classList.add('mt-4');

    const nameHeading = document.createElement('h3');
    nameHeading.classList.add('text-sm', 'text-gray-700');

    const nameLink = document.createElement('a');
    nameLink.classList.add("whitespace-normal", "break-words");

    const nameSpan = document.createElement('span');

    const nameText = document.createTextNode(name);

    const categoryParagraph = document.createElement('p');
    categoryParagraph.classList.add('mt-1', 'text-sm', 'text-gray-500');
    categoryParagraph.textContent = user;

    // Add click event listener to the imageDiv
    imageDiv.addEventListener('click', function (event) {
        event.preventDefault();

        if (horde_loras.length >= 5 || horde_loras.find(lora => lora.name === id.toString())) {
            return;
        }
        horde_loras.push({
            name: id.toString(),
            model: 1
        })
        loraCount.textContent = horde_loras.length + "/5";
        console.log(horde_loras);

        AddLora(name, id);
    });

    // Add click event listener to the nameLink
    infoDiv.addEventListener('click', function (event) {
        event.preventDefault();
        window.open("https://civitai.com/models/" + id)
    });
    infoDiv.style.cursor = "pointer";
    infoDiv.setAttribute('data-modal-target', 'loraInfoModal');
    infoDiv.setAttribute('data-modal-toggle', 'loraInfoModal');

    // Append the elements to their respective parent elements
    entryDiv.appendChild(imageDiv);
    imageDiv.appendChild(image);

    entryDiv.appendChild(infoDiv);
    infoDiv.appendChild(nameHeading);

    nameHeading.appendChild(nameLink);
    nameLink.appendChild(nameSpan);
    nameLink.appendChild(nameText);

    infoDiv.appendChild(categoryParagraph);

    // Append the entry to the container element
    const lorasContainer = document.getElementById('lorasContainer');
    lorasContainer.appendChild(entryDiv);
}


document.getElementById("searchInput").addEventListener('keyup', (e) => {

    if (e.key !== 'Enter') {
        return;
    }

    console.log("Searching for: " + e.target.value);

    if (serverType != ServerType.Horde) {
        return;
    }
    const lorasContainer = document.getElementById('lorasContainer')
    lorasContainer.innerHTML = "";


    searchingElement = document.createElement('div')
    searchingElement.classList.add('block', 'px-4', 'py-2', 'text-gray-600', 'font-bold');
    searchingElement.textContent = "Searching..."
    lorasContainer.appendChild(searchingElement)

    const civitai_nsfw = document.getElementById("civitai_nsfw");
    let url = `https://civitai.com/api/v1/models?types=LORA&nsfw=${civitai_nsfw.checked}&query=${e.target.value.replaceAll(" ", "%20")}`;
    console.log(url);
    fetch(url)
        .then(response => {
            return response.json();
        }).then(data => {
            lorasContainer.innerHTML = "";
            showCivitLoras(data);
        })
});


function showCivitLoras(data) {
    console.log(data);
    data["items"].forEach(lora => {
        let image = lora.modelVersions[0].images[0];
        if (image) {
            image = lora.modelVersions[0].images[0].url;
        }
        horde_addLoraEntry(image, lora.name, lora.creator.username, lora.id)
    });

    nextPage = data.metadata.nextPage;

    
}
let loadingContent = false
lorasContainer.addEventListener('scroll', () => {
    const distanceToBottom = lorasContainer.scrollHeight - (lorasContainer.scrollTop + lorasContainer.clientHeight);

    if (distanceToBottom <= 1000) {
        if (nextPage != null && !loadingContent) {

            console.log("Loading page ", nextPage);
            loadingContent = true
            fetch(nextPage).then(response => {
                return response.json();
            }).then(data => {
                showCivitLoras(data);
                loadingContent = false
            })
        }
    }
})