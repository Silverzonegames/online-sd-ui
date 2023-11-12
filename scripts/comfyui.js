let object_info = {}

let workflow = null
let workflow_api = {}

let models = []
let sampling_methods = [];
let schedulers = [];
let comfy_loras = []

const inputContainer = document.getElementById("comfyInputs");


object_info_loaded = false;
workflow_loaded = false;
async function RefreshComfy() {


    try {
        object_info = await FetchInfo("/object_info");
        models = object_info["CheckpointLoaderSimple"]["input"]["required"]["ckpt_name"][0];
        sampling_methods = object_info["KSampler"]["input"]["required"]["sampler_name"][0];
        schedulers = object_info["KSampler"]["input"]["required"]["scheduler"][0];

        comfy_loras = object_info["LoraLoader"].input.required.lora_name[0];
        HandleComfyLoras();

        console.log(models);
        offlineBanner.classList.add("hidden");
        connectingBanner.classList.add("hidden");

        var model_select = document.getElementById("checkpoint-selector");
        model_select.innerHTML = "";
        models.forEach(model => {
            var option = document.createElement("option");
            option.text = model;
            model_select.add(option);
        });
        document.getElementById("checkpoint-selector").value = variables["comfy_model"];

        var sampling_select = document.getElementById("sampling-method")
        sampling_select.innerHTML = "";
        sampling_methods.forEach(sampling => {
            var option = document.createElement("option");
            option.text = sampling;
            sampling_select.add(option);
        });

        var scheduler_select = document.getElementById("scheduler")
        scheduler_select.innerHTML = "";
        schedulers.forEach(scheduler => {
            var option = document.createElement("option");
            option.text = scheduler;
            scheduler_select.add(option);
        });




    } catch (error) {
        showMessage(error);
        console.error("An error occurred:", error);
    }
}

let serverAddress = url.replace("http://", "");
let clientId = uuid.v4(); // Generate a UUID for the client



//#region Generation

var last_generation_info = "";
async function GenerateComfy() {
    serverAddress = url.replace("http://", "").replace("https://", "");

    var apiWorkflow;;

    // get workflow
    apiWorkflow = await fetch("/workflows/txt2img_api.json");
    apiWorkflow = await apiWorkflow.json();




    apiWorkflow = ApplyCurrentSettingsToWorkflow(apiWorkflow);



    //create text for history
    last_generation_info = {
        "Prompt": document.getElementById("prompt").value,
        "Negative prompt": document.getElementById("negativePrompt").value,
        "Steps": document.getElementById("steps-slider").value,
        "CFG": document.getElementById("scale-slider").value,
        "Seed":-1,
        "Size": document.getElementById("width-slider").value + "x" + document.getElementById("height-slider").value,
        "Sampler": document.getElementById("sampling-method").value,
        "Scheduler": document.getElementById("scheduler").value,
        "Model": document.getElementById("checkpoint-selector").value,
        "Loras": current_comfy_loras,

        "Server":"ComfyUI"
    }

    console.log(apiWorkflow);

    getImages(apiWorkflow);

}

function ApplyCurrentSettingsToWorkflow(apiWorkflow) {
    //format prompts
    var prompt = document.getElementById("prompt").value.replaceAll("\n", "\\n");
    var negativePrompt = document.getElementById("negativePrompt").value.replaceAll("\n", "\\n");
    if (document.getElementById("averageWeights").checked) {
        prompt = normalizeWeights(prompt);
        negativePrompt = normalizeWeights(negativePrompt);
    }

    //apply current settings to workflow
    if(apiWorkflow["Positive"])
        apiWorkflow["Positive"].inputs.text = prompt || {};
    

    if(apiWorkflow["Negative"])
        apiWorkflow["Negative"].inputs.text = negativePrompt;
    

    if(apiWorkflow["CheckpointLoader"])
        apiWorkflow["CheckpointLoader"].inputs.ckpt_name = document.getElementById("checkpoint-selector").value;

    if(apiWorkflow["KSampler"]){
        
        apiWorkflow["KSampler"].inputs.seed = getRandomInt(0, 18446744073709552000);
        apiWorkflow["KSampler"].inputs.steps = document.getElementById("steps-slider").value;
        apiWorkflow["KSampler"].inputs.cfg = document.getElementById("scale-slider").value;
        apiWorkflow["KSampler"].inputs.sampler_name = document.getElementById("sampling-method").value;
        apiWorkflow["KSampler"].inputs.scheduler = document.getElementById("scheduler").value;

    }
    
    if(apiWorkflow["EmptyLatentImage"]){
        apiWorkflow["EmptyLatentImage"].inputs.width = document.getElementById("width-slider").value;
        apiWorkflow["EmptyLatentImage"].inputs.height = document.getElementById("height-slider").value;
        apiWorkflow["EmptyLatentImage"].inputs.batch_size = document.getElementById("batchSizeSlider").value;
    }
    if (current_comfy_loras.length > 0) {
        for (let i = 0; i < current_comfy_loras.length; i++) {

            var input;

            if (i == 0) {
                input = "CheckpointLoader";
            } else {
                input = "lora" + (i - 1);
            }

            apiWorkflow["lora" + i] = {
                "inputs": {
                    "lora_name": current_comfy_loras[i].lora_name,
                    "strength_model": current_comfy_loras[i].strength_model,
                    "strength_clip": current_comfy_loras[i].strength_clip,
                    "model": [
                        input,
                        0
                    ],
                    "clip": [
                        input,
                        1
                    ]
                },
                "class_type": "LoraLoader"
            };
        }
        var lastLoraNode = "lora" + (current_comfy_loras.length - 1);

        apiWorkflow["Positive"].inputs.clip[0] = lastLoraNode;
        apiWorkflow["Negative"].inputs.clip[0] = lastLoraNode;

        apiWorkflow["KSampler"].inputs.model[0] = lastLoraNode;
    }

    return apiWorkflow;
}

async function getImages(prompt) {

    const promptId = (await queuePrompt(prompt))["prompt_id"];
    const outputImages = {};

    progress_bar.classList.remove("hidden");
    progress_bar_progress.textContent = "Waiting...";
    progress_bar_progress.style.width = "100%";

    const ws = new WebSocket(`ws://${serverAddress}/ws?clientId=${clientId}`);
    ws.onmessage = event => {

        const message = JSON.parse(event.data);
        console.log(message)
        if (message.type === "progress") {
            progress_bar_progress.textContent = ((message.data.value / message.data.max) * 100).toFixed(0) + "%";
            progress_bar_progress.style.width = (message.data.value / message.data.max) * 100 + "%";
        }

        if (message.type === "executing" && message.data.node === null && message.data.prompt_id === promptId) {
            ws.close(); // Execution is done
        }
    };

    ws.onopen = () => {
        ws.send(JSON.stringify({ type: "executing" }));
    };

    ws.onclose = async () => {
        progress_bar.classList.add("hidden");
        console.log("WebSocket closed");
        const historyResponse = await fetch(`http://${serverAddress}/history`);
        console.log("History response received");
        let history = await historyResponse.json();
        history = history[promptId];
        console.log("History data:", history);
        last_generation_info["Workflow"] = history["prompt"]
        last_generation_info["Seed"] = history["prompt"][2]?.["KSampler"]?.["inputs"]?.["seed"]

        const generatedImages = [];

        for (const node_id in history.outputs) {
            const nodeOutput = history.outputs[node_id];
            if (nodeOutput.images) {
                for (const image of nodeOutput.images) {
                    const imageData = await getImage(image.filename, image.subfolder, image.type);
                    const base64ImageData = await convertToBase64(imageData);
                    generatedImages.push(base64ImageData);
                    var img = base64ImageData.replaceAll(" ", "").replaceAll("\n", "");
                    addToImageHistory(img, JSON.stringify(last_generation_info).toString());
                }
            }
        }

        console.log("Generated images:", generatedImages);

        // Display the generated images
        const imgButtonContainer = document.getElementById("imgButtons");
        imgButtonContainer.innerHTML = "";
        const imageDisplay = document.getElementById("outputImage");

        imageDisplay.src = "data:image/png;base64," + generatedImages[0];

        let i = 0;
        generatedImages.forEach((imageSrc, index) => {
            console.log("Displaying image", index + 1);
            const imageButton = document.createElement("img");
            imageButton.src = `data:image/png;base64,${imageSrc}`;
            imageButton.alt = `Generated Image ${index + 1}`;
            imageButton.classList.add(
                "w-12",
                "h-12",
                "border",
                "border-gray-500",
                "rounded-md",
                "cursor-pointer",
                "mr-2"
            );




            imageButton.addEventListener("click", () => {
                console.log("Image button clicked:", index + 1);
                imageDisplay.src = `data:image/png;base64,${imageSrc}`;
                updateFullscreenImage(imageSrc);
            });

            imgButtonContainer.appendChild(imageButton);
            i++;
        });
    };
}
function queuePrompt(prompt) {
    const data = JSON.stringify({ prompt: prompt, client_id: clientId });
    return fetch(`http://${serverAddress}/prompt`, {
        method: "POST",
        body: data,
        headers: { "Content-Type": "application/json" }
    }).then(response => response.json());
}

async function getImage(filename, subfolder, folderType) {
    const data = { filename, subfolder, type: folderType };
    const urlValues = new URLSearchParams(data).toString();
    const response = await fetch(`http://${serverAddress}/view?${urlValues}`);
    console.log(`http://${serverAddress}/view?${urlValues}`);
    return await response.blob();
}
async function convertToBase64(blob) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            resolve(event.target.result.split(',')[1]); // Extract base64 data
        };
        reader.readAsDataURL(blob);
    });
}

function FetchInfo(info) {
    return fetch(url + info)
        .then(response => response.json())
        .catch(error => {
            console.error("An error occurred:", error);
        });
}

function AddInput(id, type, label, options = null) {
    if (type === "text") {
        const inputWrapper = document.createElement("div");
        inputWrapper.className = "mb-6 border p-4 rounded border-gray-300 dark:border-gray-700";

        const inputLabel = document.createElement("label");
        inputLabel.className = "block text-lg font-semibold mb-2";
        inputLabel.textContent = label;
        inputWrapper.appendChild(inputLabel);

        const inputElement = document.createElement("textarea");
        inputElement.id = id;
        inputElement.className = "w-full px-4 py-2 rounded-lg border border-gray-500 focus:outline-none focus:border-blue-500 text-lg resize-y";
        inputElement.value = options[0];
        inputWrapper.appendChild(inputElement);

        inputContainer.appendChild(inputWrapper);
    } else if (type === "dropdown") {
        const dropdownWrapper = document.createElement("div");
        dropdownWrapper.className = "mb-6 border p-4 rounded border-gray-300 dark:border-gray-700";

        const dropdownLabel = document.createElement("label");
        dropdownLabel.className = "block text-lg font-semibold mb-2";
        dropdownLabel.textContent = label;
        dropdownWrapper.appendChild(dropdownLabel);

        const dropdownElement = document.createElement("select");
        dropdownElement.id = id;
        dropdownElement.className = "w-full p-2 border border-gray-300 dark:border-gray-700 rounded";
        for (const optionText of options) {
            const option = document.createElement("option");
            option.value = optionText;
            option.textContent = optionText;
            dropdownElement.appendChild(option);
        }
        dropdownWrapper.appendChild(dropdownElement);

        inputContainer.appendChild(dropdownWrapper);
    } else if (type === "container") {
        const containerWrapper = document.createElement("div");
        containerWrapper.className = "mb-6 border p-4 rounded border-gray-300 dark:border-gray-700";

        const containerLabel = document.createElement("label");
        containerLabel.className = "block text-lg font-semibold mb-2";
        containerLabel.textContent = label;
        containerWrapper.appendChild(containerLabel);

        let i = 0;
        for (const optionName in options) {
            const optionInfo = options[optionName];

            console.log(optionInfo);

            if (optionInfo[0] === "MODEL" || optionInfo[0] === "LATENT" || optionInfo[0] === "CONDITIONING" || optionInfo[0] === "CLIP" || optionInfo[0] === "IMAGE") {
                i++;
                continue;
            }

            const optionWrapper = document.createElement("div");
            optionWrapper.className = "mb-2 flex items-center";

            const optionLabel = document.createElement("label");
            optionLabel.className = "block text-sm font-medium w-1/3";
            optionLabel.textContent = optionName;
            optionWrapper.appendChild(optionLabel);

            if (Array.isArray(optionInfo)) {

                //dropdown
                if (optionInfo[0] != "INT" && optionInfo[0] != "FLOAT") {
                    const optionSelect = document.createElement("select");
                    optionSelect.id = id + "-" + optionName;
                    optionSelect.className = "w-2/3 p-2 border border-gray-300 dark:border-gray-700 rounded";
                    for (const option of optionInfo[0]) {
                        const optionElement = document.createElement("option");
                        optionElement.value = option;
                        optionElement.textContent = option;
                        optionSelect.appendChild(optionElement);
                    }
                    optionWrapper.appendChild(optionSelect);
                }
                //number
                else {
                    const sliderWrapper = document.createElement("div");
                    sliderWrapper.className = "flex items-center";


                    customLimits = {
                        steps: 100,
                        cfg: 20,
                        width: 2048,
                        height: 2048,
                        strength_model: 2,
                        strength_clip: 2,
                    }
                    customSteps = {
                        width: 64,
                        height: 64,
                    }
                    customMins = {
                        width: 64,
                        height: 64,
                        strength_model: -1,
                        strength_clip: -1,
                    }

                    const sliderInput = document.createElement("input");
                    sliderInput.type = "range";
                    sliderInput.className = "w-56 bg-gray-700 text-white";

                    if (customMins[optionName]) {
                        sliderInput.min = customMins[optionName];
                    } else {
                        sliderInput.min = optionInfo[1].min;
                    }


                    if (customLimits[optionName]) {
                        sliderInput.max = customLimits[optionName];
                    } else {
                        sliderInput.max = optionInfo[1].max;
                    }
                    if (customSteps[optionName]) {
                        sliderInput.step = customSteps[optionName];
                    } else {
                        sliderInput.step = optionInfo[0] === "INT" ? 1 : 0.01;
                    }
                    sliderInput.value = optionInfo[1].default;

                    sliderOptions = ["steps", "cfg", "denoise", "width", "height", "strength_model", "strength_clip"]
                    if (sliderOptions.includes(optionName)) {
                        sliderWrapper.appendChild(sliderInput);
                    }

                    const numberInput = document.createElement("input");
                    numberInput.type = "number";
                    numberInput.id = id + "-" + optionName;
                    numberInput.className = "text-white bg-gray-700 w-24 rounded";
                    numberInput.min = optionInfo[1].min;
                    numberInput.max = optionInfo[1].max;
                    numberInput.step = optionInfo[0] === "INT" ? 1 : optionInfo[1].step;
                    numberInput.value = optionInfo[1].default;
                    if (optionName === "seed") {
                        numberInput.min = -1;
                        numberInput.value = -1;
                    }
                    sliderWrapper.appendChild(numberInput);

                    sliderInput.addEventListener("input", function () {
                        numberInput.value = this.value
                    })
                    numberInput.addEventListener("input", function () {
                        sliderInput.value = this.value
                    })


                    optionWrapper.appendChild(sliderWrapper);
                }

            }

            containerWrapper.appendChild(optionWrapper);
        }

        inputContainer.appendChild(containerWrapper);
    } else if (type === "image") {
        const imageWrapper = document.createElement("div");
        imageWrapper.className = "mb-6 border p-4 rounded border-gray-300 dark:border-gray-700";

        const imageLabel = document.createElement("label");
        imageLabel.className = "block text-lg font-semibold mb-2";
        imageLabel.textContent = label;
        imageWrapper.appendChild(imageLabel);

        const imageInput = document.createElement("input");
        imageInput.type = "file";
        imageInput.id = id;
        imageInput.accept = "image/*";
        imageInput.className = "hidden"; // Hide the actual input
        imageWrapper.appendChild(imageInput);

        const imagePreview = document.createElement("div");
        imagePreview.className = "flex items-center mt-2";

        const uploadedImage = document.createElement("img");
        uploadedImage.id = "uploadedImage";
        uploadedImage.className = "w-48 h-48 object-cover border border-gray-500 rounded-lg shadow-md cursor-pointer";
        imagePreview.appendChild(uploadedImage);

        const fileNameLabel = document.createElement("div");
        fileNameLabel.id = id + "-image";
        fileNameLabel.className = "ml-4 text-white";
        imagePreview.appendChild(fileNameLabel);

        imageWrapper.appendChild(imagePreview);

        inputContainer.appendChild(imageWrapper);

        // Open file dialog when the image is clicked
        uploadedImage.addEventListener("click", function () {
            imageInput.click();
        });

        // Update the uploaded image and file name when a file is selected
        imageInput.addEventListener("change", async function () {
            if (this.files && this.files[0]) {
                uploadedImage.src = URL.createObjectURL(this.files[0]);
                fileNameLabel.textContent = "Uploading...";

                const formData = new FormData();
                formData.append("image", this.files[0]);

                try {
                    const response = await fetch(url + "/upload/image", {
                        method: "POST",
                        body: formData,
                    });

                    if (response.ok) {
                        // Handle successful response if needed
                        const responseData = await response.json();
                        console.log("Image uploaded:", responseData);
                        fileNameLabel.textContent = responseData["name"];
                    } else {
                        // Handle error response if needed
                        console.error("Image upload failed:", response.status, response.statusText);
                    }
                } catch (error) {
                    // Handle fetch error
                    console.error("Fetch error:", error);
                }
            }
        });
    }
    else if (type === "mask") {
        const imageWrapper = document.createElement("div");
        imageWrapper.className = "mb-6 border p-4 rounded border-gray-300 dark:border-gray-700";

        const imageLabel = document.createElement("label");
        imageLabel.className = "block text-lg font-semibold mb-2";
        imageLabel.textContent = label;
        imageWrapper.appendChild(imageLabel);

        const imageInput = document.createElement("input");
        imageInput.type = "file";
        imageInput.id = id;
        imageInput.accept = "image/*";
        imageInput.className = "hidden"; // Hide the actual input
        imageWrapper.appendChild(imageInput);

        const imagePreview = document.createElement("div");
        imagePreview.className = "flex items-center mt-2";

        const uploadedImage = document.createElement("img");
        uploadedImage.id = "uploadedImage";
        uploadedImage.className = "w-48 h-48 object-cover border border-gray-500 rounded-lg shadow-md cursor-pointer";
        imagePreview.appendChild(uploadedImage);

        const fileNameLabel = document.createElement("div");
        fileNameLabel.id = id + "-image";
        fileNameLabel.className = "ml-4 text-white";
        imagePreview.appendChild(fileNameLabel);

        imageWrapper.appendChild(imagePreview);

        inputContainer.appendChild(imageWrapper);

        // Open file dialog when the image is clicked
        uploadedImage.addEventListener("click", function () {
            imageInput.click();
        });

        // Update the uploaded image and file name when a file is selected
        imageInput.addEventListener("change", async function () {
            if (this.files && this.files[0]) {
                uploadedImage.src = URL.createObjectURL(this.files[0]);
                fileNameLabel.textContent = "Uploading...";

                const formData = new FormData();
                formData.append("image", this.files[0]);

                try {
                    const response = await fetch(url + "/upload/image", {
                        method: "POST",
                        body: formData,
                    });

                    if (response.ok) {
                        // Handle successful response if needed
                        const responseData = await response.json();
                        console.log("Image uploaded:", responseData);
                        fileNameLabel.textContent = responseData["name"];
                    } else {
                        // Handle error response if needed
                        console.error("Image upload failed:", response.status, response.statusText);
                    }
                } catch (error) {
                    // Handle fetch error
                    console.error("Fetch error:", error);
                }
            }
        });
    }
}

async function LatentUpscaleWithComfy() {
    var file_name = await UploadImageToComfyServer(document.getElementById("outputImage"),true);

    upscale_workflow = await fetch("/workflows/latent_upscale_api.json");
    upscale_workflow = await upscale_workflow.json();

    upscale_workflow = ApplyCurrentSettingsToWorkflow(upscale_workflow);


    upscale_workflow["LoadImage"].inputs.image = file_name;

    upscale_workflow["LatentUpscaleBy"].inputs.scale_by = document.getElementById("comfy-latent-upscale-scale").value;
    upscale_workflow["LatentUpscaleBy"].inputs.upscale_method = document.getElementById("comfy-latent-upscale-method").value;

    console.log(upscale_workflow);
    getImages(upscale_workflow);
}
async function UploadImageToComfyServer(image,overwrite = true) {
    var imageBase64 = image.src.replace("data:image/png;base64,", "");
    var imageBlob = base64ToBlob(imageBase64, "image/png");

    const formData = new FormData();
    formData.append("image", imageBlob,"ToBeUpscaled.png");
    formData.append("overwrite", overwrite)

    const response = await fetch(url + "/upload/image", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        console.error("Image upload failed:", response.status, response.statusText);
        return;
    }

    const responseData = await response.json();
    var filename = responseData["name"];
    return filename;
}


function base64ToBlob(base64, mime) {
    mime = mime || '';
    var sliceSize = 1024;
    var byteChars = window.atob(base64);
    var byteArrays = [];

    for (var offset = 0, len = byteChars.length; offset < len; offset += sliceSize) {
        var slice = byteChars.slice(offset, offset + sliceSize);

        var byteNumbers = new Array(slice.length);
        for (var i = 0, sliceLen = slice.length; i < sliceLen; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        var byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: mime });

}



document.getElementById("comfy-latent-upscale-btn").addEventListener("click", LatentUpscaleWithComfy);

//#endregion

//#region Loras
const comfyLoraContainer = document.getElementById("comfyLoraContainer");
const comfy_currentLoraContainer = document.getElementById("comfy_currentLoraContainer");

let current_comfy_loras = [];

function HandleComfyLoras() {
    let folder = "";
    categories = ["All"];
    comfyLoraContainer.innerHTML = "";
    comfy_loras.forEach(lora => {

        let lora_name = getNameFromPath(lora);
        //Add Categories
        lora = lora.replaceAll("/", "\\");
        let folders = lora.split("\\");
        for (let i = 0; i < folders.length - 1; i++) {

            folder = (i == 0) ? folders[i] : folder + "\\" + folders[i];

            if (!categories.includes(folder)) {
                categories.push(folder);
            }
        }
        addComfycategoryButtons();

        // Add Lora Card
        const loraCard = document.createElement("div");
        loraCard.id = lora;
        loraCard.classList.add(
            "lora",
            "flex",
            "flex-col",
            "items-center",
            "justify-center",
            "rounded-lg",
            "border",
            "border-gray-700",
            "p-4",
            "cursor-pointer",
            "hover:border-blue-500",
            "hover:text-blue-500",
            "transition",
            "duration-200",
            "ease-in-out",
            "bg-gradient-to-br", "from-gray-900", "to-gray-800" // Dark background with gradient
        );
        loraCard.addEventListener("click", () => handleComfyLoraClick(lora));

        const label = document.createElement("label");
        label.textContent = lora_name;
        label.classList.add(
            "text-center",
            "text-xl",
            "m-1",
            "break-all",
            "font-semibold",
            "text-white", // White text on dark background
            "drop-shadow-lg", // Add shadow for text
            "px-2", // Add horizontal padding
            "py-1" // Add vertical padding
        );
        loraCard.appendChild(label);

        comfyLoraContainer.appendChild(loraCard);
    });
}
function handleComfyLoraClick(lora) {


    if (current_comfy_loras.find(x => x.lora_name == lora)) {
        current_comfy_loras = current_comfy_loras.filter(x => x.lora_name != lora);
    } else {
        current_comfy_loras.push({
            lora_name: lora,
            strength_model: 1,
            strength_clip: 1,
        });

    }


    RefreshCurrentComfyuiLoras();
}
function RefreshCurrentComfyuiLoras() {

    console.log(current_comfy_loras);

    comfy_currentLoraContainer.innerHTML = "";

    current_comfy_loras.forEach((current_lora, index) => {
        const loraDiv = document.createElement("div");
        loraDiv.classList.add('border-gray-700', 'border', 'rounded', 'flex', 'items-center', 'p-4');

        const innerDiv = document.createElement('div');
        innerDiv.classList.add('w-full');

        const flexDiv = document.createElement('div');
        flexDiv.classList.add('flex', 'justify-between', 'items-center');

        const h1 = document.createElement('h1');
        h1.classList.add('text-xl', 'font-bold', 'mb-2', 'text-white');
        h1.textContent = getNameFromPath(current_lora.lora_name);

        const removeBtn = document.createElement('button');
        removeBtn.classList.add('bg-red-500', 'text-white', 'hover:bg-red-700', 'font-bold', 'py-2', 'px-4', 'rounded', 'mt-4');
        const icon = document.createElement('i');
        icon.classList.add('fa-solid', 'fa-trash-can');
        removeBtn.appendChild(icon);

        removeBtn.addEventListener('click', function () {
            current_comfy_loras = current_comfy_loras.filter(x => x.lora_name != current_lora.lora_name);
            RefreshCurrentComfyuiLoras();
        });

        loraDiv.appendChild(innerDiv);
        innerDiv.appendChild(flexDiv);
        flexDiv.appendChild(h1);
        flexDiv.appendChild(removeBtn);

        // input.setAttribute('type', 'range');
        // input.setAttribute('id', 'lora_strength_' + id);
        // input.setAttribute('name', 'strength');
        // input.classList.add('block', 'w-full', 'mt-1');
        // input.setAttribute('min', '-2');
        // input.setAttribute('max', '4');
        // input.setAttribute('step', '0.05');
        // input.setAttribute('value', '1');

        const model_slider_label = document.createElement('label');
        model_slider_label.classList.add('block', 'text-sm', 'font-medium', 'text-white');
        model_slider_label.setAttribute('for', 'strength_model_' + index);
        model_slider_label.textContent = "Model Strength:" + current_lora.strength_model;


        const model_slider = document.createElement('input');
        model_slider.type = "range";
        model_slider.name = "strength_model";
        model_slider.id = "strength_model_" + index;
        model_slider.classList.add('block', 'w-full', 'mt-1');
        model_slider.min = -2;
        model_slider.max = 4;
        model_slider.step = 0.05;
        model_slider.value = current_lora.strength_model;

        const clip_slider_label = document.createElement('label');
        clip_slider_label.classList.add('block', 'text-sm', 'font-medium', 'text-white');
        clip_slider_label.setAttribute('for', 'strength_clip_' + index);
        clip_slider_label.textContent = "Clip Strength:" + current_lora.strength_clip;


        const clip_slider = document.createElement('input');
        clip_slider.type = "range";
        clip_slider.name = "strength_clip";
        clip_slider.id = "strength_clip_" + index;
        clip_slider.classList.add('block', 'w-full', 'mt-1');
        clip_slider.min = -2;
        clip_slider.max = 4;
        clip_slider.step = 0.05;
        clip_slider.value = current_lora.strength_clip;


        model_slider.addEventListener('input', function () {
            current_comfy_loras[index].strength_model = this.value;
            model_slider_label.textContent = "Model Strength:" + this.value;
        });
        clip_slider.addEventListener('input', function () {
            current_comfy_loras[index].strength_clip = this.value;
            clip_slider_label.textContent = "Clip Strength:" + this.value;
        });

        innerDiv.appendChild(model_slider_label);
        innerDiv.appendChild(model_slider);
        innerDiv.appendChild(clip_slider_label);
        innerDiv.appendChild(clip_slider);

        comfy_currentLoraContainer.appendChild(loraDiv);

    });
}


function addComfycategoryButtons() {
    const categoriesContainer = document.getElementById("categories");
    categoriesContainer.innerHTML = "";
    categories.forEach(category => {

        showButton = false;

        let selectedCategoryLength = subCategory;
        let buttonCategoryLength = category.split("\\").length;
        let isSelected = category == currentCategory;
        let isSubCategory = selectedCategoryLength + 1 == buttonCategoryLength && category.includes(currentCategory + "\\");
        let selectedFolderHasSubFolders = GetSubCategoryCount(currentCategory) > 0;
        let isParentFolder = currentCategory.includes(category + "\\");
        let isSiblingFolder = selectedCategoryLength == buttonCategoryLength && getParentFolder(category) == getParentFolder(currentCategory);
        if (category == "All" && category != currentCategory) {
            isParentFolder = true;
        }


        //always show selected category
        if (isSelected) {
            showButton = true;
        }
        //show next subcategory
        if (isSubCategory) {
            showButton = true;
        }
        //show parent folder
        if (isParentFolder) {
            showButton = true;
        }
        if (!selectedFolderHasSubFolders && isSiblingFolder) {
            showButton = true;
        }

        //show all folders when all is selected or if selected folder doesn't have any subfolders
        if (currentCategory == "All" || (!GetSubCategoryCount(currentCategory) && subCategory == 1)) {
            showButton = buttonCategoryLength == 1;
        }
        //always add All category button
        if (category == "All") {
            showButton = true;
        }

        if (showButton) {

            let suffix = "";
            if (isParentFolder || isSelected) {
                suffix = "/";
            }

            const button = document.createElement('button');
            button.textContent = category.split("\\")[category.split("\\").length - 1] + suffix;
            button.classList.add('px-4', 'py-2', 'text-white', 'rounded', 'mr-2', 'mb-2');
            if (isSelected) {
                button.classList.add('bg-white', 'text-blue-600', "border-blue-600", "border");
            } else if (isParentFolder) {
                button.classList.add('bg-blue-600');
            }
            else if (isSiblingFolder) {
                button.classList.add('border');
            }
            else {
                button.classList.add('bg-gray-500');
            }
            button.addEventListener('click', () => handleComfyCategoryClick(category));
            categoriesContainer.appendChild(button);
        }

    });
}
function handleComfyCategoryClick(category) {
    console.log('Category clicked:', category);
    currentCategory = category;
    subCategory = category.split("\\").length;

    addComfycategoryButtons();


    //get all elements in comfyLoraContainer
    const _elements = comfyLoraContainer.querySelectorAll(".lora");
    for (var i = 0; i < _elements.length; i++) {
        var element = _elements[i];

        if (category == "All") {
            element.classList.remove("hidden");
            continue;
        }

        loraCategory = element.id;
        //lower trim replace
        loraCategory = loraCategory.toLowerCase().trim().replaceAll("\\", "/");
        category = category.toLowerCase().trim().replaceAll("\\", "/");

        if (loraCategory.startsWith(category)) {
            element.classList.remove("hidden");
        } else {
            element.classList.add("hidden");

        }

    }

}
document.getElementById("searchInput").addEventListener("input", function (e) {
    if (serverType === ServerType.ComfyUI) {
        handleComfySearch(e.target.value);
    }
});
function handleComfySearch(search) {
    const _elements = comfyLoraContainer.querySelectorAll(".lora");
    for (var i = 0; i < _elements.length; i++) {
        var element = _elements[i];
        if (element.id.toLowerCase().includes(search.toLowerCase())) {
            element.classList.remove("hidden");
        } else {
            element.classList.add("hidden");
        }
    }
}

//#endregion

function getNameFromPath(path) {
    return path.split("\\")[path.split("\\").length - 1].replaceAll(".safetensors", "").replaceAll(".pt", "").replaceAll(".ckpt", "");
}

function convertWorkflowToApiFormat(workflow) {
    const apiWorkflow = {};

    workflow["nodes"].forEach(node => {
        const node_info = object_info[node["type"]];
        const apiNode = {
            inputs: {},
            class_type: node["type"],
        };

        //console.log("----------", node["type"], "----------");
        // console.log(node["inputs"]);
        // console.log(node_info);

        for (const [inputName, inputDef] of Object.entries(node_info["input"]["required"])) {

            //console.log(inputName);

            const inputType = inputDef[0];

            isLink = false;

            if (node["inputs"]) {
                isLink = node["inputs"].find(input => input.name === inputName);
            }

            //Link
            if (isLink) {
                parentNode = null;
                link = -1;

                node["inputs"].forEach(input => {
                    if (parentNode !== null || input.name !== inputName) {
                        return; // If parentNode is already found, exit the loop
                    }


                    workflow["nodes"].forEach(_node => {
                        if (parentNode !== null) {
                            return; // If parentNode is already found, exit the inner loop
                        }

                        if (_node["outputs"]) {
                            for (let i = 0; i < _node["outputs"].length; i++) {
                                const output = _node["outputs"][i];
                                if (output["links"]) {
                                    if (output["links"].includes(input.link)) {
                                        //console.log(node["id"], input.name, input.link, " <--> ", _node["id"], output.name, output["links"]);
                                        parentNode = _node["id"].toString();
                                        link = i;

                                    }
                                }
                            }
                        }
                    });
                });


                apiNode.inputs[inputName] = [parentNode, link];
            }
            //variable
            else {
                if (node["type"] === "LoadImage") {
                    apiNode.inputs["image"] = document.getElementById(node["id"] + "-image").textContent.toString();
                } else if (node["type"] === "LoadImageMask") {
                    apiNode.inputs["image"] = document.getElementById(node["id"] + "-image").textContent.toString();
                    apiNode.inputs["channel"] == "alpha"
                }
                else {
                    inputID = node["id"] + "-" + inputName;
                    if (document.getElementById(inputID)) {
                        value = document.getElementById(inputID).value;
                        apiNode.inputs[inputName] = value;
                        if (inputName === "seed" && value == -1) {
                            apiNode.inputs[inputName] = getRandomInt(0, 18446744073709552000);
                        }

                    } else {
                        if (inputDef[1]) {
                            apiNode.inputs[inputName] = inputDef[1].default;
                        }
                    }
                }

            }

        }

        apiWorkflow[node["id"]] = apiNode;
    });

    return apiWorkflow;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

document.getElementById("nodes-toggle").addEventListener("change", function () {

    const targetIframe = document.getElementById("nodes-iframe");

    setTimeout(1000);

    //open
    if (this.checked) {

        targetIframe.src = url + "/?workflow=" + JSON.stringify(workflow);
        console.log(url + "/?workflow=" + JSON.stringify(workflow));
        targetIframe.classList.remove("hidden");


    } else {
        targetIframe.classList.add("hidden");
    }
});