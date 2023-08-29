let user = null;
let horde_url = "https://stablehorde.net/api"
let model_reference_url = "https://raw.githubusercontent.com/Haidra-Org/AI-Horde-image-model-reference/main/stable_diffusion.json"

let token = "0000000000";

let horde_models = null;


const userNameText = document.getElementById("userName");
const modelDropdown = document.getElementById("model-name");

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
        'apikey': url, // Replace with your API key
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


function showModelDisplay(_model){
    model = horde_models[_model];

    modelDropdown.value = _model;

    img_url = "";
    if(model.showcases){
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
    //add seed if specifed
    if (parseInt(seedDropdown.value) != -1 && seedDropdown.value) {
        payload["params"]["seed"] = seedDropdown.value;
    }
    console.log(JSON.stringify(payload, null, 2));

    fetch(`${horde_url}/v2/generate/async`, {
        method: 'POST',
        headers: {
            'apikey': url,
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


function checkGenerationStatus() {
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
        updateFullscreenImage(generatedImages[0].toString());
        const imgButtonContainer = document.getElementById("imgButtons");
        imgButtonContainer.innerHTML = "";

        i = 0;

        generatedImages.forEach((imageSrc, index) => {



            if (document.getElementById("saveToHistory").checked) {

                addToImageHistory(imageSrc, generations[i]);
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
        if(element.textContent.toLowerCase().includes(e.target.value.toLowerCase())){
            element.classList.remove("hidden");
        }else{
            element.classList.add("hidden");
        }
    });
});

