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
const cancelBtn = document.getElementById("cancelBtn");

let horde_loras = [];





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

let nsfw_level = {
    None:0,
    Soft:1,
    Mature:2,
    X:3,
}

current_id = 0;

generations = [];

function UpdateHorde() {
    UpdateUser();
    getHordeModels();
    civitaiSearch("");
}

// Update the user information
function UpdateUser() {



    const headers = {
        'apikey': token, 
    };

    fetch(`${horde_url}/v2/find_user`, {
        method: 'GET',
        headers: headers
    }).then(response => response.json())
        .then(data => {
            // Handle the data returned from the API
            console.log(data);
            user = data;

            //use default token if invalid
            if (data.username == null) {
                token = "0000000000";
                UpdateUser();
                return;
            }

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
                modelDropdown.value = variables["model"];
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
    generateBtn.classList.add("hidden");
    cancelBtn.classList.remove("hidden");
    //document.getElementById("outputImage").classList.add("blur");
    //document.getElementById("imgButtons").classList.add("blur");

    payload = {
        "prompt": promptField.value.replaceAll("###", "") + "###" + negativePromptField.value,
        "params": {
            "sampler_name": samplerDropdown.value,
            "cfg_scale": parseFloat(cfgSlider.value),
            "width": parseInt(width),
            "height": parseInt(height),
            "steps": parseInt(stepsSlider.value),
            "n": parseInt(batchSizeSlider.value),
        },
        "nsfw": document.getElementById("allowNSFW").checked,
        "slow_workers": document.getElementById("slowWorkers").checked,
        "models": [modelDropdown.value],
        "r2": false //use base64 instead of links
    }

    if(horde_loras.length > 0){
        payload["params"]["loras"] = horde_loras;
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
            }
            states_container.classList.remove("hidden");

            waitingNumber.textContent = horde_status["waiting"];
            processingNumber.textContent = horde_status["processing"];
            finishedNumber.textContent = horde_status["finished"];

            setTimeout(checkGenerationStatus, 1000);
        }
    })
}

function OnGenerationFinished() {

    generateBtn.classList.remove("hidden");
    cancelBtn.classList.add("hidden");


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
        if(generatedImages[0]){
            imageDisplay.src = generatedImages[0].toString();
            if ('Notification' in window) {
                Notification.requestPermission()
                    .then(permission => {
                        if (permission === 'granted') {
                            const notificationOptions = {
                                body: 'Click to view your images',
                                icon: generatedImages[0].toString() // URL of the notification icon
                            };
        
                            const notification = new Notification('Generation Finished!', notificationOptions);
                            
                            notification.onclick = () => {
                                // Handle click event when user clicks on the notification
                                // You can redirect to a specific page or perform an action here
                            };
                        }
                    });
            }
            updateFullscreenImage(generatedImages[0].toString());

        }

        progress_container.classList.add("hidden");
        progress_bar.classList.add("hidden");
        //document.getElementById("outputImage").classList.remove("blur");
        //document.getElementById("imgButtons").classList.remove("blur");

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

// Add lora To Active Loras
function horde_AddLora(name, id, tokens=[]) {
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

    const btnDiv = document.createElement('div');
    btnDiv.classList.add('flex', 'justify-between', 'items-center');


    const favoriteBtn = document.createElement('button');
    favoriteBtn.classList.add( 'font-bold', 'py-2', 'px-4', 'rounded', 'mt-4');
    const favoriteIcon = document.createElement('i');
    favoriteIcon.classList.add('fa-solid', 'fa-heart');
    favoriteBtn.appendChild(favoriteIcon);
    btnDiv.appendChild(favoriteBtn);
    if(isFavorited(id)){
        favoriteIcon.classList.add('text-rose-600');
    }else{
        favoriteIcon.classList.add('text-white');
    }

    favoriteBtn.addEventListener('click', function () {
        favorite_lora(id,favoriteIcon);
    })

    const button = document.createElement('button');
    button.classList.add('bg-red-500', 'text-white','hover:bg-red-700', 'font-bold', 'py-2', 'px-4', 'rounded', 'mt-4');
    const icon = document.createElement('i');
    icon.classList.add('fa-solid', 'fa-trash-can');
    button.appendChild(icon);
    btnDiv.appendChild(button);

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
        let _lora = horde_loras.find(lora => lora.name === id.toString());

        _lora.model = parseFloat(input.value);
        _lora.clip = parseFloat(input.value);
    })

    const tokenLabel = document.createElement('label');
    const tokenDiv = document.createElement('div');
    
    if (tokens.length > 0) {
        tokenLabel.classList.add('text-white', 'block', 'mb-1');
        tokenLabel.textContent = 'Activation Tokens: ';
        tokenDiv.classList.add('flex', 'flex-wrap', 'items-center');  // Adding 'flex-wrap' class for wrapping tokens
    
        tokens.forEach(token => {
            let tokenBlock = document.createElement('code');
            tokenBlock.classList.add('text-white', 'block', 'mb-1', 'mr-2');  // Adding 'mr-2' class for margin between tokens
            tokenBlock.textContent = token;
            tokenDiv.appendChild(tokenBlock);
        });
    
        AddCodeBlockButtons(tokenDiv);
    }
    

    // Assemble the elements
    flexDiv.appendChild(h1);
    flexDiv.appendChild(btnDiv);
    innerDiv.appendChild(flexDiv);
    innerDiv.appendChild(label);
    innerDiv.appendChild(input);
    innerDiv.appendChild(tokenLabel);
    innerDiv.appendChild(tokenDiv);
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


function UpdateCurrentLoras() {
    //remove all loras
    horde_loraContainer.innerHTML = "";

    horde_loras.forEach(lora => {
        horde_AddLora(lora.name, lora.name, lora.tokens);
        
    });
}




cancelBtn.addEventListener('click', () => {
    fetch(horde_url + "/v2/generate/status/" + current_id, {
        method: 'DELETE'
    })
        .then(response => {
            if (response.ok) {
                // Handle success
                console.log("cancel request was successful.");
            } else {
                // Handle errors
                console.error("Cancel request was not successful.");
            }
        })
        .catch(error => {
            console.error("An error occurred:", error);
        });
})