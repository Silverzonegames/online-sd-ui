let object_info = {}

let workflow_file = "workflows/txt2img.json";
let workflow = null
let workflow_api = {}

let models = []
let sampling_methods = [];
let schedulers = [];

const inputContainer = document.getElementById("comfyInputs");


object_info_loaded = false;
workflow_loaded = false;
async function RefreshComfy() {


    try {
        object_info = await FetchInfo("/object_info");
        models = object_info["CheckpointLoaderSimple"]["input"]["required"]["ckpt_name"][0];
        sampling_methods = object_info["KSampler"]["input"]["required"]["sampler_name"][0];
        schedulers = object_info["KSampler"]["input"]["required"]["scheduler"][0];
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

        if (workflow == null) {
            const workflowResponse = await fetch(workflow_file);
            workflow = await workflowResponse.json();
            console.log(workflow);
        }



        inputContainer.innerHTML = "";
        return;

        AddInput("workflowDropdown", "dropdown", "Workflow", ["txt2img", "txt2img_vae", "img2img", "img2img_vae", "inpaint", "lora", "sdxl", "Custom"]);

        if (workflow_file == "Custom") {
            document.getElementById("workflowDropdown").value = "Custom";
        } else {
            document.getElementById("workflowDropdown").value = workflow_file.split("/")[1].split(".")[0];
        }

        document.getElementById("workflowDropdown").addEventListener("change", (e) => {

            if (e.target.value == "Custom") {
                workflow_file == "Custom";
                // Prompt the user to upload a JSON file
                const fileInput = document.createElement("input");
                fileInput.type = "file";
                fileInput.accept = "application/json";
                fileInput.addEventListener("change", (event) => {
                    const uploadedFile = event.target.files[0];

                    if (uploadedFile) {
                        const reader = new FileReader();
                        reader.onload = (fileEvent) => {
                            try {
                                workflow = JSON.parse(fileEvent.target.result);
                                RefreshComfy();
                            } catch (error) {
                                console.error("Error parsing uploaded JSON:", error);
                            }
                        };
                        reader.readAsText(uploadedFile);
                    }
                });

                fileInput.click(); // Simulate a click on the file input to open the file picker
            } else {
                workflow_file = "workflows/" + e.target.value + ".json";
                workflow = null;
                // Fetch and assign the JSON data from 'workflow_file' if needed
                RefreshComfy();
            }
        });

        workflow["nodes"].forEach(node => {
            if (node["type"] === "CLIPTextEncode") {
                const title = node["title"] || "CLIPTextEncode";
                AddInput(node["id"] + "-text", "text", title, node["widgets_values"]);
            }
        });

        workflow["nodes"].forEach(node => {
            if (node["type"] === "CheckpointLoaderSimple") {
                const title = node["title"] || "CheckpointLoaderSimple";
                AddInput(node["id"] + "-ckpt_name", "dropdown", title, models);
            }
            if (node["type"] === "VAELoader") {
                const title = node["title"] || "VAE Loader";
                AddInput(node["id"], "container", title, object_info["VAELoader"]["input"]["required"]);
            }
            if (node["type"] === "LoraLoader") {
                const title = node["title"] || "Lora Loader";
                AddInput(node["id"], "container", title, object_info["LoraLoader"]["input"]["required"]);
            }
            if (node["type"] === "LoadImage") {
                console.log("image");
                const title = node["title"] || "Image";
                AddInput(node["id"], "image", title);
            }
            if (node["type"] === "LoadImageMask") {
                const title = node["title"] || "Image Mask";
                AddInput(node["id"], "mask", title);
            }
        });

        workflow["nodes"].forEach(node => {
            if (node["type"] === "KSampler") {
                const title = node["title"] || "KSampler";
                AddInput(node["id"], "container", title, object_info["KSampler"]["input"]["required"]);
            }
            if (node["type"] === "KSamplerAdvanced") {
                const title = node["title"] || "KSampler (Advanced)";
                AddInput(node["id"], "container", title, object_info["KSampler"]["input"]["required"]);
            }
            if (node["type"] === "EmptyLatentImage") {
                const title = node["title"] || "EmptyLatentImage";
                AddInput(node["id"], "container", title, object_info["EmptyLatentImage"]["input"]["required"]);
            }
            if (node["type"] === "ImageScale") {
                const title = node["title"] || "ImageScale";
                AddInput(node["id"], "container", title, object_info["ImageScale"]["input"]["required"]);
            }
        });



    } catch (error) {
        showMessage(error);
        console.error("An error occurred:", error);
    }
}

let serverAddress = url.replace("http://", "");
let clientId = uuid.v4(); // Generate a UUID for the client

function queuePrompt(prompt) {
    const data = JSON.stringify({ prompt: prompt, client_id: clientId });
    return fetch(`http://${serverAddress}/prompt`, {
        method: "POST",
        body: data,
        headers: { "Content-Type": "application/json" }
    }).then(response => response.json());
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

        const generatedImages = [];

        for (const node_id in history.outputs) {
            const nodeOutput = history.outputs[node_id];
            if (nodeOutput.images) {
                for (const image of nodeOutput.images) {
                    const imageData = await getImage(image.filename, image.subfolder, image.type);
                    const base64ImageData = await convertToBase64(imageData);
                    generatedImages.push(base64ImageData);
                    console.log("Generated image:", base64ImageData);
                    var img = base64ImageData.replaceAll(" ", "").replaceAll("\n", "");
                    addToImageHistory(img, last_generation_info);
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


async function convertToBase64(blob) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            resolve(event.target.result.split(',')[1]); // Extract base64 data
        };
        reader.readAsDataURL(blob);
    });
}

async function getImage(filename, subfolder, folderType) {
    const data = { filename, subfolder, type: folderType };
    const urlValues = new URLSearchParams(data).toString();
    const response = await fetch(`http://${serverAddress}/view?${urlValues}`);
    console.log(`http://${serverAddress}/view?${urlValues}`);
    return await response.blob();
}

var last_generation_info = "";

async function GenerateComfy() {
    serverAddress = url.replace("http://", "").replace("https://", "");

    var apiWorkflow;;

    if (uploadedImageBase64 == "") {
        apiWorkflow = await fetch("/workflows/txt2img_api.txt");
        apiWorkflow = await apiWorkflow.text();
    }
    var prompt = document.getElementById("prompt").value.replaceAll("\n", "\\n");
    var negativePrompt = document.getElementById("negativePrompt").value.replaceAll("\n", "\\n");
    if (document.getElementById("averageWeights").checked) {
        prompt = normalizeWeights(prompt);
        negativePrompt = normalizeWeights(negativePrompt);
    }

    apiWorkflow = apiWorkflow.replaceAll("{prompt}", prompt);
    apiWorkflow = apiWorkflow.replaceAll("{negative}", negativePrompt);
    apiWorkflow = apiWorkflow.replaceAll("{model_name}", document.getElementById("checkpoint-selector").value.replace("\\", "\\\\"));
    apiWorkflow = apiWorkflow.replaceAll("{sampler}", document.getElementById("sampling-method").value);
    apiWorkflow = apiWorkflow.replaceAll("{scheduler}", document.getElementById("scheduler").value);
    apiWorkflow = apiWorkflow.replaceAll("{width}", document.getElementById("width-slider").value);
    apiWorkflow = apiWorkflow.replaceAll("{height}", document.getElementById("height-slider").value);
    apiWorkflow = apiWorkflow.replaceAll("{batch_size}", document.getElementById("batchSizeSlider").value);
    apiWorkflow = apiWorkflow.replaceAll("{cfg}", document.getElementById("scale-slider").value);
    apiWorkflow = apiWorkflow.replaceAll("{steps}", document.getElementById("steps-slider").value);
    apiWorkflow = apiWorkflow.replaceAll("{seed}", getRandomInt(0, 18446744073709552000));

    //prompt,negative,steps,size, cfg, model, sampler, scheduler
    last_generation_info += prompt +
        "\nNegative prompt: " + negativePrompt +
        "\nModel: " + document.getElementById("checkpoint-selector").value +
        "\nSampler: " + document.getElementById("sampling-method").value +
        "\nScheduler: " + document.getElementById("scheduler").value +
        "\nSize: " + document.getElementById("width-slider").value + "x" + document.getElementById("height-slider").value +
        "\nSteps: " + document.getElementById("steps-slider").value +
        "\nCFG: " + document.getElementById("scale-slider").value;
        "Server: ComfyUI\n\n";

    //convert to json¨
    console.log(apiWorkflow);
    apiWorkflow = JSON.parse(apiWorkflow);
    console.log(apiWorkflow);



    getImages(apiWorkflow);

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