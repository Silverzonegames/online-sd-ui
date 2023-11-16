const prompt = document.getElementById("prompt");
const seed = document.getElementById("seed");
const cfg = document.getElementById("cfg");
const steps = document.getElementById("steps");
const lcm = document.getElementById("lcm");
const model = document.getElementById("model");
const negativePrompt = document.getElementById("negativePrompt");
const url = document.getElementById("url");
const errorMessage = document.getElementById("errorMessage");
const lcm_lora = document.getElementById("lcm_lora");
const resolution = document.getElementById("resolution");
const canvas_container = document.getElementById("canvas_container");
const canvas_checkbox = document.getElementById("canvas-checkbox");
const denoise = document.getElementById("denoise");

var options = {};

var last_prompt = "";

var latest_requested_workflow = undefined;
var latest_fulfilled_workflow = undefined;

var generation_times_ms = [];

var object_info = undefined;

let timeout = null;

prompt.addEventListener("keyup", function () {
  clearTimeout(timeout);
  timeout = setTimeout(function () {
      Generate();

  }, 200);
});
negativePrompt.addEventListener("keyup", function () {
  clearTimeout(timeout);
  timeout = setTimeout(function () {
      Generate();

  }, 1000);
});

seed.addEventListener("change",  Generate);
cfg.addEventListener("change",  Generate);
steps.addEventListener("change",  Generate);
lcm.addEventListener("change",  Generate);
denoise.addEventListener("change",  Generate);

function OnGenerateFinished() {
  generating = false;
  if(latest_requested_workflow != latest_fulfilled_workflow){
    Generate();
  }
}

var generating = false;
async function Generate() {
  if (!clientId) {
    clientId = uuid.v4();
  }





  if (seed.value == "") {
    seed.value = Math.floor(Math.random() * 100000);
  }


  var workflow;

  if(canvas_checkbox.checked){
    
    //get base64 from canvas
    var base64 = canvas.toDataURL("image/png").replace("data:image/png;base64,", "");
    var file_name = await UploadImageToComfyServer(base64, "canvas.png", true);

    workflow = await fetch("../workflows/lcm_img2img_api.json");
  }else{
    workflow = await fetch("../workflows/lcm_api.json");
  }

  workflow = await workflow.json();

  workflow["6"].inputs.text = prompt.value;
  workflow["7"].inputs.text = negativePrompt.value;
  workflow["3"].inputs.seed = parseInt(seed.value);
  workflow["3"].inputs.cfg = parseFloat(cfg.value);
  workflow["3"].inputs.steps = parseInt(steps.value);
  workflow["10"].inputs.strength_model = parseFloat(lcm.value);

  workflow["4"].inputs.ckpt_name = model.value;
  workflow["10"].inputs.lora_name = lcm_lora.value;

  if(canvas_checkbox.checked){
    workflow["11"].inputs.image = file_name;
    workflow["3"].inputs.denoise = denoise.value;
  }

  latest_requested_workflow = workflow;

  if (generating) {
    return;
  }

  const saveButton = document.getElementById("save");
  saveButton.disabled = false;
  saveButton.textContent = "Save";


  last_prompt = prompt.value;

  generating = true;

  getImages(workflow);
}
let serverAddress = "127.0.0.1:8188";
let clientId = uuid.v4();
//#region API
var end_time = 0;
var start_time = 0;
var message_count = 0;
async function getImages(prompt) {
  message_count = 0;
  start_time = performance.now();
  latest_fulfilled_workflow = prompt;
  const promptId = (await queuePrompt(prompt))["prompt_id"];
  console.log("Generating: ", promptId);
  const outputImages = {};

  document.getElementById("spinner").classList.remove("hidden");

  const ws = new WebSocket(`ws://${serverAddress}/ws?clientId=${clientId}`);
  ws.onmessage = (event) => {
    try {
      
      const message = JSON.parse(event.data);
      
      //handle 
      if(message_count == 0 && message.type == "status" && message.data.status.exec_info.queue_remaining == 0){
        generating = false;
        ws.close();
      }

      if (message.type === "executing" && message.data.node === null && message.data.prompt_id === promptId) {
        end_time = performance.now();
        ws.close(); // Execution is done
      }
      
      message_count++;
    } catch { }
  };


  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "executing" }));
  };

  ws.onclose = async () => {
    generating = false;
    document.getElementById("spinner").classList.add("hidden");


    var time = end_time - start_time;
    if(time < 0){
      time = 0;
    }
    generation_times_ms.push(time);
    const avrg_time = generation_times_ms.reduce((a, b) => a + b, 0) / generation_times_ms.length;
    console.log("Generation time: ", time, "ms", "Average time: ", avrg_time, "ms");

    const historyResponse = await fetch(`http://${serverAddress}/history`);
    let history = await historyResponse.json();
    history = history[promptId];

    const generatedImages = [];

    for (const node_id in history.outputs) {
      const nodeOutput = history.outputs[node_id];
      if (nodeOutput.images) {
        for (const image of nodeOutput.images) {
          const imageData = await getImage(
            image.filename,
            image.subfolder,
            image.type
          );
          const base64ImageData = await convertToBase64(imageData);
          generatedImages.push(base64ImageData);
        }
      }
    }

    document.getElementById("image").src =
      "data:image/png;base64," + generatedImages[0];

    document.getElementById("image_prompt").textContent = last_prompt;
    document.getElementById("image_time").textContent = time.toFixed(0) + "ms";

    OnGenerateFinished();
  };

  ws.onerror = (error) => {
    console.log("WebSocket error: ", error);
    generating = false;
  }
}
async function convertToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event.target.result.split(",")[1]); // Extract base64 data
    };
    reader.readAsDataURL(blob);
  });
}
function queuePrompt(prompt) {
  const data = JSON.stringify({ prompt: prompt, client_id: clientId });
  return fetch(`http://${serverAddress}/prompt`, {
    method: "POST",
    body: data,
    headers: { "Content-Type": "application/json" },
  }).then((response) => response.json());
}
async function getImage(filename, subfolder, folderType) {
  const data = { filename, subfolder, type: folderType };
  const urlValues = new URLSearchParams(data).toString();
  const response = await fetch(`http://${serverAddress}/view?${urlValues}`);
  return await response.blob();
}
//#endregion

//#region Saving and loading

function Save() {
  options["prompt"] = prompt.value;
  options["negativePrompt"] = negativePrompt.value;
  options["seed"] = seed.value;
  options["cfg"] = cfg.value;
  options["steps"] = steps.value;
  options["lcm"] = lcm.value;
  options["model"] = model.value;
  options["lcm_lora"] = lcm_lora.value;
  options["resolution"] = resolution.value;
  options["url"] = url.value;

  localStorage.setItem("lcm_options", JSON.stringify(options));
}
function Load() {
  options = JSON.parse(localStorage.getItem("lcm_options"));

  if (!options) {
    //default options
    options = {
      prompt: "",
      negativePrompt: "(worst quality:1.6, low quality:1.6),",
      seed: null,
      cfg: 1.0,
      steps: 4,
      lcm: 1,
      model: null,
      lcm_lora: null,
      resolution: 512,
      url: "http://127.0.0.1:8188",
    }
  }
  
  prompt.value = options["prompt"];
  negativePrompt.value = options["negativePrompt"];
  seed.value = options["seed"];
  if(seed.value == undefined || seed.value == ""){
    seed.value = Math.floor(Math.random() * 100000);
  }
  cfg.value = options["cfg"];
  steps.value = options["steps"];
  lcm.value = options["lcm"];
  model.value = options["model"];
  lcm_lora.value = options["lcm_lora"];
  resolution.value = options["resolution"];
  url.value = options["url"];
  serverAddress = url.value.replace("http://", "").replace("https://", "");
}
//#endregion
async function FetchComfyUI(){
  model.innerHTML = "";
  lcm_lora.innerHTML = "";
  errorMessage.textContent = "";
  try{
    object_info = await fetch(`http://${serverAddress}/object_info`);
    object_info = await object_info.json();


    var lcm_loras = object_info["LoraLoader"].input.required.lora_name[0].filter(_lcm => _lcm.includes("lcm"));

    lcm_lora.innerHTML = "";
    lcm_loras.forEach(_lcm => {
      const option = document.createElement("option");
      option.value = _lcm;
      option.text = _lcm;
      lcm_lora.appendChild(option);
    });
    //set lcm_lora
    if(options["lcm_lora"]){
      lcm_loras.includes(options["lcm_lora"]) ? lcm_lora.value = options["lcm_lora"] : lcm_lora.value = lcm_loras[0];
    }else{
      lcm_loras.includes("lcm-lora-sdv1-5.safetensors") ? lcm_lora.value = "lcm-lora-sdv1-5.safetensors" : lcm_lora.value = lcm_loras[0];
    }

    if(lcm_loras.length == 0){
      errorMessage.innerHTML = "No LCM Loras found!. Please download some LCM Loras from <a class='underline' href='https://huggingface.co/collections/latent-consistency/latent-consistency-models-loras-654cdd24e111e16f0865fba6'>Here</a> and Rename them to include 'lcm' in the name";
      return;
    }
    

    //set model
    object_info["CheckpointLoaderSimple"].input.required.ckpt_name[0].forEach(_model => {
      const option = document.createElement("option");
      option.value = _model;
      option.text = _model;
      model.appendChild(option);
    });
    if(options["model"]){
      object_info["CheckpointLoaderSimple"].input.required.ckpt_name[0].includes(options["model"]) ? model.value = options["model"] : model.value = object_info["CheckpointLoaderSimple"].input.required.ckpt_name[0][0];
    }
    if(!object_info["KSampler"].input.required.sampler_name[0].includes("lcm")) {
      errorMessage.innerHTML = "LCM Sampler not found! Please update ComfyUI to the latest version";
    }
      

  }catch (error){

    //if TypeError
    if(error instanceof TypeError){
      errorMessage.innerHTML = "ComfyUI instance Not found/running";
    }

    console.log(error);

  }



}

async function UploadImageToComfyServer(image, filename = "Image.png", overwrite = true) {

  var imageBase64;
  if (image.src) {
      imageBase64 = image.src.replace("data:image/png;base64,", "");
  } else {
      imageBase64 = image.replace("data:image/png;base64,", "");
  }
  var imageBlob = base64ToBlob(imageBase64, "image/png");

  const formData = new FormData();
  formData.append("image", imageBlob, filename);
  formData.append("overwrite", overwrite)
  formData.append("subfolder", "silverzone")

  const response = await fetch(url.value + "/upload/image", {
      method: "POST",
      body: formData,
  });

  if (!response.ok) {
      console.error("Image upload failed:", response.status, response.statusText);
      return;
  }

  const responseData = await response.json();
  var filename = responseData["name"];
  var subfolder = responseData["subfolder"];
  return subfolder + "/" + filename;
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


Load();
FetchComfyUI();
//On submit / press enter
url.addEventListener("keyup", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    serverAddress = url.value.replace("http://", "").replace("https://", "");
    FetchComfyUI();
  }
});

canvas_checkbox.addEventListener("change", function (event) {
  if (event.target.checked) {
    canvas_container.classList.remove("hidden");
  } else {
    canvas_container.classList.add("hidden");
  }
});
document.getElementById("randomize").addEventListener("click", function (event) {
  document.getElementById('seed').value = Math.floor(Math.random() * 10000000); 
  Generate();
});
document.getElementById("save").addEventListener("click", function (e) {
  e.target.textContent = "Saved!";
  e.target.disabled = true;



  addToImageHistory(document.getElementById("image").src, prompt.value);
});


window.onbeforeunload = function () {
  Save();
};
//F5
document.addEventListener("keydown", function (event) {
  if (event.key === "F5") {
    event.preventDefault();
    Generate();
  }
});

Coloris({
  themeMode: 'dark',
  swatches: [

    '#264653',
    '#2a9d8f',
    '#e9c46a',
    'rgb(244,162,97)',
    '#e76f51',
    '#d62828',
    //green
    '#2b9348',
    '#ffffff',
    '#000000',
    '#f0d9b5',
    '#8d6e63',
  ],
});



function createIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open("ImageDB", 1);

    request.onerror = (event) => {
      console.error("Error opening database:", event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("images")) {
        db.createObjectStore("images", { keyPath: "id", autoIncrement: true });
      }
    };
  });
}

async function addToImageHistory(imageBase64, text) {
  try {
    const db = await createIndexedDB();
    const transaction = db.transaction(["images"], "readwrite");
    const store = transaction.objectStore("images");

    const imageBlob = base64toBlob(imageBase64); // Helper function to convert base64 to Blob
    const entry = { imageBlob, text, timestamp: Date.now() };

    store.add(entry);

    console.log("Image and text added to the history successfully. with text: " + text);
  } catch (error) {
    console.error("Error while adding image and text to history:", error);
  }
}


function base64toBlob(base64Data) {

  const binaryString = atob(base64Data.replace("data:image/png;base64,",""));
  const arrayBuffer = new ArrayBuffer(binaryString.length);
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < binaryString.length; i++) {
    uint8Array[i] = binaryString.charCodeAt(i);
  }

  return new Blob([uint8Array], { type: "image/png" }); // Change the type accordingly for different image formats
}