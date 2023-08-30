//default values
variables = {
    prompt: "",
    negativePrompt: "",
    steps: 20,
    cfg: 7,
    seed: -1,
    width: 512,
    height: 512,
    sampler: "Euler a",
    batch_size: 1,
    styles: [],
    saveToServer:false,
    saveToHistory:true,
    generatedImage: "/placeholder.png",
    generatedImages: [],
    img2imgImage: "",
    img2imgMask: "",
    serverType: ServerType.Automatic1111,
    url: "http://127.0.0.1:7860",
    token: "0000000000",
    workflow_file: "txt2img",
    workflow: null,
    favorite_loras : []
}
function GetCurrentState(){
    variables["prompt"] = promptField.value;
    variables["negativePrompt"] = negativePromptField.value;
    variables["steps"] = stepsSlider.value;
    variables["cfg"] = cfgSlider.value;
    variables["seed"] = seedDropdown.value;
    variables["width"] = width;
    variables["height"] = height;
    variables["sampler"] = samplerDropdown.value;
    variables["batch_size"] = batchSizeSlider.value;
    variables["styles"] = selectedStyles;
    variables["saveToServer"] = document.getElementById("saveToServer").checked;
    variables["saveToHistory"] = document.getElementById("saveToHistory").checked;
    variables["generatedImage"] = document.getElementById("outputImage").src;
    variables["generatedImages"] = generatedImages;
    variables["img2imgImage"] = uploadedImageBase64;
    variables["img2imgMask"] = maskImageBase64;
    variables["serverType"] = serverType;
    variables["token"] = token;
    variables["url"] = url;
    variables["workflow_file"] = document.getElementById("workflowDropdown")?.value;
    variables["workflow"] = workflow;
    variables["favorite_loras"] = favorite_loras;
}


function SaveState() {

    if(!SavingIsPossible)
        return;

    GetCurrentState();
    localStorage.setItem("state", JSON.stringify(variables));
}
SavingIsPossible = false;

function LoadState() {
    
    //check if localstorage has item 
    if (localStorage.getItem("state")){
        variables = JSON.parse(localStorage.getItem("state"));
    }

    //server
    serverType = variables["serverType"];
    document.getElementById("serverTypeDropdown").value = variables["serverType"];
    token = variables["token"];
    UpdateServer(variables["serverType"], false);
    urlInput.value = variables["url"];
    document.getElementById("tokenInput").value = variables["token"];
    UpdateHorde();


    url = variables["url"];
    handleURLChange();


    //workflow
    if(document.getElementById("workflowDropdown")) {
        document.getElementById("workflowDropdown").value = variables["workflow_file"];
        if(variables["workflow_file"] == "Custom"){
            workflow_file = "Custom";
            workflow = variables["workflow"];
        }else{
            workflow_file = "workflows/"+variables["workflow_file"]+".json";
            workflow = null;
        }
    }



    //load variables
    promptField.value = variables["prompt"];
    negativePromptField.value = variables["negativePrompt"];

    stepsSlider.value = variables["steps"];
    cfgSlider.value = variables["cfg"];
    seedDropdown.value = variables["seed"];

    width = variables["width"];
    widthSlider.value = variables["width"];
    widthText.textContent = "Width: " + width;
    height = variables["height"];
    heightSlider.value = variables["height"];
    heightText.textContent = "Height: " + height;

    samplerDropdown.value = variables["sampler"];
    batchSizeSlider.value = variables["batch_size"];

    selectedStyles = variables["styles"];
    favorite_loras = variables["favorite_loras"];

    document.getElementById("saveToServer").checked = variables["saveToServer"];
    document.getElementById("saveToHistory").checked = variables["saveToHistory"];

    if(variables["img2imgImage"] != ""){
        maskImageBase64 = variables["img2imgImage"];
        document.getElementById("imageUploadText").classList.add("hidden");
        document.getElementById("imageOptions").classList.remove("hidden");
        document.getElementById("removeImageButton").classList.remove("hidden");
        document.getElementById("uploadedImage").src = "data:image/png;base64,"+variables["img2imgImage"];
        document.getElementById("image").src = "data:image/png;base64,"+variables["img2imgImage"];
    }

    if(variables["img2imgMask"] != ""){
        maskImageBase64 = variables["img2imgMask"];
        document.getElementById("maskImage").src = "data:image/png;base64,"+variables["img2imgMask"];
        document.getElementById("accordion-inpainting-options").classList.remove("hidden");
    }   


    document.getElementById("outputImage").src = variables["generatedImage"];

    UpdateLoraDisplays();
    SavingIsPossible = true;

}

window.addEventListener("beforeunload", SaveState);
window.addEventListener("unload", SaveState);
LoadState();