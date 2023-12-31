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

function readEXIFMetadataFromBase64(base64String) {

  base64String = base64String.split(",")[1];

  return new Promise((resolve, reject) => {
    // Convert the base64 string to a binary blob
    const binary = atob(base64String);
    const array = [];
    for (let i = 0; i < binary.length; i++) {
      array.push(binary.charCodeAt(i));
    }
    const byteArray = new Uint8Array(array);

    // Use exif-js to read the metadata
    EXIF.getData(byteArray, function () {
      const exifData = EXIF.getAllTags(this);
      resolve(exifData);
    });

    // Handle errors, if any
    EXIF.getTag(this, "Error", function (error) {
      reject(error);
    });
  });
}


function updateFullscreenImage(base64) {

  base64 = String(base64);

  if(!base64.startsWith("data:image/png;base64,")) {
    base64 = "data:image/png;base64," + base64;
  }

  document.getElementById("fullscreenImage").src = `${base64}`;
  const info = document.getElementById("fullscreenInfo");





  readEXIFMetadataFromBase64(base64)
  .then((exifData) => {
    console.log("EXIF Metadata:", exifData);
  })
  .catch((error) => {
    console.error("Error reading EXIF metadata:", error);
  });

    
}

function boldWords(text, wordsToBold) {
  wordsToBold.forEach(word => {
    const regex = new RegExp(word, "gi");
    text = text.replace(regex, match => `<br><strong>${match}</strong>`);
    const numberRegex = /\b\d+\b/g;
    //text = text.replace(numberRegex, match => `<span style="color: cyan;">${match}</span>`);
  });
  return text;
}










function RemoveFromPrompt(string){

  tags = promptField.value.split(",");

  for(let i = 0; i < tags.length; i++){
    tags[i] = tags[i].trim();
    if(tags[i] == string){
      tags.splice(i, 1); // Remove the element at index i from the tags array
      promptField.value = tags.join(", ");
      promptField.value = promptField.value.replaceAll(",,",",");
      if(promptField.value.startsWith(",")){
        promptField.value = promptField.value.replace(",","");
      }
      return;
    }
  }

  if(IsInPrompt(", "+string)){
    promptField.value = promptField.value.replace(", "+string, "");
  }else{
    promptField.value = promptField.value.replace(string, "");
  }
  promptField.value = promptField.value.replaceAll(",,",",");
  if(promptField.value.startsWith(",")){
    promptField.value = promptField.value.replace(",","");
  }
}
function AddToPrompt (tag, forceSingleInstance = false,ignoreLoras=false) {
  if (forceSingleInstance == true && IsInPrompt(tag,false,ignoreLoras)) {
    
  }else{
    if(promptField.value.replaceAll(" ","").length>0){
      promptField.value = promptField.value.replace(/[,\s]+$/, "") + ", " + tag;
    }else{
      promptField.value += tag;
    }
  }
}

function IsInPrompt(string, exact=false, ignoreLoras=false){

  if(ignoreLoras == true){
    string = string.replaceAll(/<[^>]*>/g, "");
  }


  if(exact == false){
    return promptField.value.includes(string);
  }else{
    tags = promptField.value.split(",");

    inPrompt = false;

    for(let i = 0; i < tags.length; i++){
      tags[i] = tags[i].trim();
      if(tags[i] == string){
        inPrompt = true;
      }
    }
    return inPrompt;
  }
}



function getParentFolder(inputString) {
  const lastBackslashIndex = inputString.lastIndexOf("\\");
  if (lastBackslashIndex !== -1) {
    return inputString.substring(0, lastBackslashIndex);
  } else {
    // If there is no backslash in the string, return the input string as is.
    return inputString;
  }
}

function GetSubCategoryCount(name) {
  count = 0;
  categories.forEach(category => {
    if (category != name) {
      if (category.includes(name + "\\")) {
        count++;
      }
    }
  });
  return count;
}

function isNeighboringNumber(number1, number2) {
  return Math.abs(number1 - number2) === 1 || number1 === number2;
}



function handleURLChange() {
  url = urlInput.value
  
  SaveState();

  if(serverType === ServerType.Automatic1111){
    getSamplers();
    getCheckpoints()
    getAllInstalled();
    updateStyles();
    getUpscalers();
    GetControlnetModel("inpaint");
    GetDataDir();
    checkStatus();
    HandleLoras();
    ControlNetInit()
    //changeCode(url);
  }else if (serverType === ServerType.ComfyUI){
    RefreshComfy();
  }
}

function getLoraByName(name) {
  return loras.find(lora => lora.name === name);
}
function GetDataDir() {
  fetch(url + '/internal/sysinfo')
    .then(response => response.json())
    .then(data => {
      installDir = data["Data path"]
      console.log("Data path:", installDir);
    })
}

//#region styles
// JavaScript to handle the dropdown functionality
const dropdownButton = document.getElementById('stylesDropdownButton');
const dropdown = document.getElementById('stylesDropdown');

dropdownButton.addEventListener('click', () => {
  dropdown.classList.toggle('hidden');
});

// Close the dropdown when clicking outside
document.addEventListener('click', (event) => {
  if (!dropdown.contains(event.target) && event.target !== dropdownButton) {
    dropdown.classList.add('hidden');
  }
});

// Function to add styles dynamically to the dropdown
function addStyleToDropdown(styleName) {
  if (styleName.startsWith("____")) {
    // Create a header element for styles starting with "____"
    const header = document.createElement('div');
    header.classList.add('block', 'px-4', 'py-2', 'text-gray-600', 'font-bold');
    header.textContent = styleName.replace(/^_+/, '').replace("____", "");
    dropdown.appendChild(header);
  } else {
    // Create a checkbox element for regular styles
    const label = document.createElement('label');
    label.classList.add('block', 'px-4', 'py-2', 'text-black');
    label.innerHTML = `
          <input type="checkbox" value="${styleName}"> ${styleName}
        `;

    if(selectedStyles.includes(styleName)){
      label.querySelector("input").checked = true;
    }
      
    dropdown.appendChild(label);
  }
}

function updateStyles() {
  dropdown.innerHTML = "";
  fetch(url + '/sdapi/v1/prompt-styles')
    .then(response => response.json())
    .then(data => {

      //clear styles dropdown
      dropdown.innerHTML = "";  

      data.forEach(style => {
        addStyleToDropdown(style.name);
      });

      // After adding styles, attach event listeners to the checkboxes
      const styleCheckboxes = document.querySelectorAll('#stylesDropdown input[type="checkbox"]');
      

      styleCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            selectedStyles.push(checkbox.value);
          } else {
            const index = selectedStyles.indexOf(checkbox.value);
            if (index !== -1) {
              selectedStyles.splice(index, 1);
            }
          }

        });
      });
    });
}
let upscalers = [];


function updateUpscalers(id,useIndexValue=false){
  const upscalerDropdown = document.getElementById(id);
  upscalerDropdown.innerHTML = ""; // Clear existing options
  upscalers.forEach((upscaler,index) => {
    const option = document.createElement("option");
    if(useIndexValue){
      option.value = index; // Value is the index of the upscaler
    }else{
      option.value = upscaler;
    }
    option.textContent = upscaler;
    upscalerDropdown.appendChild(option);
  });
}

// Call updateStyles() to fetch and populate styles initially


//#endregion

//#region image Input
// Get the image input and the image element
const imageInput = document.getElementById('imageInput');
const uploadedImage = document.getElementById('uploadedImage');

weightSlider.addEventListener('input', function () {
  weightValue.textContent = weightSlider.value;
});

// Add an event listener to the image input to update the image element when an image is selected
imageInput.addEventListener('change', function () {
  const file = imageInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function () {
      UploadImage(reader.result,imageInput.files[0].name);
    };
    reader.readAsDataURL(file);

    //update outpaintcanvas
    canvas_uploadedImage = new Image();
    canvas_uploadedImage.src = URL.createObjectURL(file);
    canvas_uploadedImage.onload = () => {
        drawImageOnCanvas();
    };
  }
});
// Event listener for the drop event on the drop area
document.getElementById('imageContainer').addEventListener('drop', function (e) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function () {
      UploadImage(reader.result);
    };
    reader.readAsDataURL(file);
  }
});
// Prevent the default behavior when an item is dragged over the image container
document.getElementById('imageContainer').addEventListener('dragover', function (e) {
  e.preventDefault();
});


//#endregion

async function UploadImage(source,name="image.png") {
  uploadedImage.src = source;
  uploadedImageBase64 = source.replace("data:image/png;base64,", "");
  removeImageButton.classList.remove("hidden")
  console.log(uploadedImageBase64);

  const imgElement = new Image();
  imgElement.src = source;
  document.getElementById("image").src = source;
  clearCanvas();
  document.getElementById("maskImage").src = "";
  setCanvasDimensions();
  redrawCanvasOnResize();
  imgElement.onload = function () {
    let _width = imgElement.naturalWidth;
    let _height = imgElement.naturalHeight;
    imageWidth = _width;
    imageHeight = _height;

    const res = LimitResolution(_width, _height,512);
    _width = res[0];
    _height = res[1];

    width = _width;
    height = _height;

    widthSlider.value = _width;
    widthText.textContent = "Width: " + _width;

    heightSlider.value = _height;
    heightText.textContent = "Height: " + _height;

    console.log("Image Resolution:", imageWidth, "x", imageHeight);
    document.getElementById("imagesizeText").textContent = "Size: " + _width + "x" + _height;
    // Now you can use 'width' and 'height' for your desired purpose.
  };

  uploadedImage.classList.remove('hidden');
  document.getElementById("imageUploadText").classList.add("hidden");
  document.getElementById("imageOptions").classList.remove("hidden");
  document.getElementById("accordion-open-body-3").classList.remove("hidden");

  if(serverType == ServerType.ComfyUI){

    //upload image to comfyUI
    var file_name = await UploadImageToComfyServer(source,name,false);
    document.getElementById("img2imgFileName").textContent = file_name;
    comfy_imagefile = file_name;
  }
}

//#region Canvas
// Get the image and canvas elements
const image = document.getElementById("image");
const canvas = document.getElementById("drawable-canvas");
const ctx = canvas.getContext("2d");

// Function to set canvas dimensions to match the image dimensions
function setCanvasDimensions() {
  canvas.width = imageWidth ? imageWidth : image.width;
  canvas.height = imageHeight ? imageHeight : image.height;
  ctx.lineWidth = 10;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "white";
}

// Call the function initially
setCanvasDimensions();

// Function to redraw canvas when the window is resized
function redrawCanvasOnResize() {
  // Create a temporary canvas to store the existing drawings from the original canvas
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  // Draw the original canvas content onto the temporary canvas
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  tempCtx.drawImage(canvas, 0, 0);

  // Resize the original canvas to match the new dimensions
  canvas.width = image.width;
  canvas.height = image.height;
  // Set the canvas drawing properties (you can customize these)
  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "white"; // Change the brush color to white

  // Draw the content from the temporary canvas back onto the resized canvas
  ctx.drawImage(tempCanvas, 0, 0);
}

// Function to clear the canvas
function clearCanvas() {
  // Clear the entire canvas by resetting the context
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
// Function to check if the canvas is empty
function isCanvasEmpty() {
  const canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 0; i < canvasData.length; i += 4) {
    if (canvasData[i + 3] !== 0) {
      return false; // If any non-transparent pixel is found, the canvas is not empty
    }
  }
  return true; // If all pixels are transparent, the canvas is considered empty
}

// Function to handle brush size change
function handleBrushSizeChange() {
  ctx.lineWidth = this.value;
}

// Function to toggle eraser mode
function toggleEraser() {
  if (this.checked) {
    // Enable eraser mode by setting the globalCompositeOperation to "destination-out"
    ctx.globalCompositeOperation = "destination-out";
  } else {
    // Disable eraser mode and set the globalCompositeOperation back to "source-over"
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "white"; // Set the brush color back to white for regular drawing
  }
}

// Event listener to redraw the canvas when the window is resized
window.addEventListener("resize", redrawCanvasOnResize);


// Event listener for a button click to clear the canvas
const clearButton = document.getElementById("clear-button");
clearButton.addEventListener("click", clearCanvas);

// Event listener for brush size change
const brushSizeInput = document.getElementById("brush-size");
brushSizeInput.addEventListener("input", handleBrushSizeChange);

// Event listener for eraser toggle
const eraserToggle = document.getElementById("eraser-toggle");
eraserToggle.addEventListener("change", toggleEraser);

// Set the initial drawing state
let isDrawing = false;
let lastX = 0;
let lastY = 0;

function startDrawing(e) {
  isDrawing = true;
  [lastX, lastY] = [e.offsetX, e.offsetY];
}

function draw(e) {
  if (!isDrawing) return;
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();
  [lastX, lastY] = [e.offsetX, e.offsetY];
}

function stopDrawing() {
  isDrawing = false;
}

// Event listeners for mouse events
canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseout", stopDrawing);

// Event listeners for touch events
canvas.addEventListener("touchstart", (e) => {
  const touch = e.touches[0];
  const mouseEvent = new MouseEvent("mousedown", {
    clientX: touch.clientX,
    clientY: touch.clientY,
  });
  canvas.dispatchEvent(mouseEvent);
});

canvas.addEventListener("touchmove", (e) => {
  const touch = e.touches[0];
  const mouseEvent = new MouseEvent("mousemove", {
    clientX: touch.clientX,
    clientY: touch.clientY,
  });
  canvas.dispatchEvent(mouseEvent);
});

canvas.addEventListener("touchend", () => {
  const mouseEvent = new MouseEvent("mouseup", {});
  canvas.dispatchEvent(mouseEvent);
});

//#endregion

//#region Lora Sliders

// Function to add Lora sliders dynamically
function addLoraSliders(loraNames) {

  const sliderContainer = document.getElementById('sliderContainer');

  if (loraNames.length == 0) {
    sliderContainer.innerHTML = "";
    return;
  };


  sliderContainer.innerHTML = "";



  loraNames.forEach((loraName) => {
    const weight = GetLoraWeight(loraName);


    const loraDiv = document.createElement('div');
    loraDiv.classList.add('border-gray-700', 'border', 'rounded', 'flex', 'items-center', 'p-4');

    const innerDiv = document.createElement('div');
    innerDiv.classList.add('w-full');

    const flexDiv = document.createElement('div');
    flexDiv.classList.add('flex', 'justify-between', 'items-center');

    const h1 = document.createElement('h1');
    h1.classList.add('text-xl', 'font-bold', 'mb-2', 'text-white');
    h1.textContent = loraName;

    const btnDiv = document.createElement('div');
    btnDiv.classList.add('flex', 'justify-between', 'items-center');

    // Create a button to delete the Lora
    const button = document.createElement('button');
    button.classList.add("delete-button", 'bg-red-500', 'text-white','hover:bg-red-700', 'font-bold', 'py-2', 'px-4', 'rounded', 'mt-4');
    const icon = document.createElement('i');
    icon.classList.add('fa-solid', 'fa-trash-can');
    button.appendChild(icon);
    button.dataset.name = loraName;
    btnDiv.appendChild(button);


    const label = document.createElement('label');
    label.classList.add('text-white', 'block', 'mb-1');
    label.setAttribute('for', 'strength');
    label.textContent = 'Strength: '+weight;

    const input = document.createElement('input');
    input.setAttribute('type', 'range');
    //input.setAttribute('id', 'lora_strength_' + id);
    input.setAttribute('name', 'strength');
    input.classList.add('block', 'w-full', 'mt-1');
    input.setAttribute('min', '-5');
    input.setAttribute('max', '5');
    input.setAttribute('step', '0.05');
    input.setAttribute('value', weight);
    input.addEventListener('input', function () {
      const formattedValue = formatSliderValue(parseFloat(this.value));
      label.textContent = 'Strength: '+formattedValue;
      ChangeLoraWeight(loraName, this.value);
    });
    


    const div = document.createElement('div');
    div.className = 'flex items-center justify-between mb-4';
    div.innerHTML = `
        <p class="font-bold w-32 whitespace-normal break-words">${loraName.replaceAll("_", " ")}</p>
        <div class="slider-container">
          <input type="range" class="w-full" min="-1" max="2" step="0.05" value="${weight}">
          <span class="ml-2 text-white weight-display">${weight}</span>
        </div>
        <button class="ml--8 text-red-500 delete-button mr-8" data-name="${loraName}"><i class="fas fa-trash"></i></button>
      `;

    sliderContainer.appendChild(div);
  });

  // Listen for slider changes
  const sliders = document.querySelectorAll('.slider-container input');
  const weightDisplays = document.querySelectorAll('.weight-display');

  sliders.forEach((slider, index) => {
    slider.addEventListener('input', function () {
      const formattedValue = formatSliderValue(parseFloat(this.value));
      weightDisplays[index].textContent = formattedValue;
      console.log(`${loraNames[index]}: ${formattedValue}`);
      ChangeLoraWeight(loraNames[index], this.value);
    });
  });

  // Set up event listeners for trash buttons
  const deleteButtons = document.querySelectorAll('.delete-button');

  deleteButtons.forEach((button) => {
    button.addEventListener('click', function () {
      const loraName = this.getAttribute('data-name');
      removeLoraFromPrompt(loraName);
      UpdateLoraDisplays();
    });
  });
}

// Function to format the slider value with a trailing ".0" if it's a whole number
function formatSliderValue(value) {
  return value.toFixed(2);
}

//#endregion

// Example usage: adding a new Lora entry
const imageSrc = 'http://example.com/image.jpg';
const name = 'Lora Name';
const category = 'Lora Category';


function getCivitInfoByFilename(name) {
  return installed_models.find(model => model.filename === name)
}




function Download() {
  var a = document.createElement("a"); //Create <a>
  a.href = document.getElementById("outputImage").src //Image Base64 Goes here
  a.download = "Image.png"; //File name Here
  a.click(); //Downloaded file
}




function GetBackendFromUrlString() {
  const currentURL = window.location.href;
  const queryStringIndex = currentURL.indexOf('?url=');
  if (queryStringIndex !== -1) {
    return currentURL.slice(queryStringIndex + 5);
  } else {
    return null; // Return null if there's no "?url=" in the URL
  }
}
function isLocalhost(url) {
  const hostname = new URL(url).hostname;
  return /^localhost|^127(?:\.[0-9]+){0,2}\.[0-9]+$|^\[::1\]$/.test(hostname);
}




function showMessage(message, duration = 5000,type="Error") {
  const targetEl = document.getElementById('errorMessage');
  targetEl.innerText = message;

  document.getElementById("errorType").textContent = type;

  const alertEl = document.getElementById('alert');
  alertEl.classList.remove('hidden');

  setTimeout(() => {
    alertEl.classList.add('hidden');
  }, duration);

  const dismissButton = document.getElementById('dismissButton');
  dismissButton.addEventListener('click', () => {
    alertEl.classList.add('hidden');
  });
}

function LimitResolution(width,height,max){
  let _width = width;
  let _height = height;

  if(width < height){
    _width = max;
    _height = parseInt(height/width*max);
  }else{
    _height = max;
    _width = parseInt(width/height*max);
  }

  return [_width,_height];
}






widthSlider.addEventListener('input', () => {
  // Update the width value label
  widthText.textContent = "Width: " + widthSlider.value;
  width = widthSlider.value;
})
heightSlider.addEventListener('input', () => {
  // Update the height value label
  heightText.textContent = "Height: " + heightSlider.value;
  height = heightSlider.value;
})



const stepsSlider = document.getElementById("steps-slider");
const stepsValue = document.getElementById("steps-value");
const cfgSlider = document.getElementById("scale-slider");
const cfgValue = document.getElementById("cfg-value");

// Event listener for generate button
generateBtn.addEventListener('click', () => {

  
  if(serverType == ServerType.Automatic1111){
    generateImage(false);
  }else if (serverType == ServerType.ComfyUI){
    console.log("Generate");
    GenerateComfy();
  }else if(serverType == ServerType.Horde){
    console.log("Generate");
    GenerateHorde();
  }
})
downloadBtn.addEventListener("click", Download);
urlInput.addEventListener("change", handleURLChange)
batchSizeSlider.addEventListener('input', () => {
  // Update the batch size value label
  batchSizeValue.textContent = "Batch Size: " + batchSizeSlider.value;
});
stepsSlider.addEventListener('input', () => {
  // Update the steps value label
  stepsValue.textContent = "Steps: " + stepsSlider.value;
})
cfgSlider.addEventListener('input', (e) => {

  console.log(e.target.value);
  // Update the steps value label
  cfgValue.textContent = "CFG Scale: " + e.target.value;
})
document.getElementById("pixels-slider").addEventListener('input', () => {
  document.getElementById("pixels-slider-value").textContent = document.getElementById("pixels-slider").value;
})
paintButton.addEventListener('click', () => {
  setTimeout(() => {
    redrawCanvasOnResize();
  }, 500);
})
document.getElementById("paintDoneBtn").addEventListener('click', () => {

  // Check if the canvas is empty
  if (isCanvasEmpty()) {
    console.log("Canvas is empty. Removing mask.");
    maskImageBase64 = "";
    document.getElementById("maskImage").src = "";
    document.getElementById("accordion-inpainting-options").classList.add("hidden");
    return;
  }

  // Show the inpainting options accordion
  document.getElementById("accordion-inpainting-options").classList.remove("hidden");

  // Get the canvas and create a Data URL from the canvas image
  const canvas = document.getElementById("drawable-canvas");
  const dataURL = canvas.toDataURL("image/png");

  // Get the new canvas width and height from the variables
  const newCanvasWidth = imageWidth;
  const newCanvasHeight = imageHeight;

  // Create a new canvas with the desired dimensions
  const scaledCanvas = document.createElement("canvas");
  scaledCanvas.width = newCanvasWidth;
  scaledCanvas.height = newCanvasHeight;

  // Get the 2D context of the new canvas
  const ctx = scaledCanvas.getContext("2d");

  // Create a new image object to load the existing canvas data URL
  const img = new Image();
  img.src = dataURL;

  // When the image is loaded, draw it onto the new canvas with the desired dimensions
  img.onload = () => {
    // Clear the new canvas
    ctx.clearRect(0, 0, newCanvasWidth, newCanvasHeight);

    // Draw the existing canvas image onto the new canvas with the desired dimensions
    ctx.drawImage(img, 0, 0, newCanvasWidth, newCanvasHeight);

    // Get the scaled canvas data URL
    const scaledDataURL = scaledCanvas.toDataURL("image/png");

    // Set the maskImage source to the scaled data URL
    document.getElementById("maskImage").src = scaledDataURL;

    // Store the scaled mask image as base64
    maskImageBase64 = scaledDataURL.replace("data:image/png;base64,", "");
  };
});
document.getElementById("useImageBtn").addEventListener('click', () => {
  const image = document.getElementById("outputImage").src;
  UploadImage(image);
})
document.getElementById("loraUseBtn").addEventListener('click', () => {
  if(currentLoraInfo != ""){
    handleLoraEntryClick(currentLoraInfo);
  }
})
loraInfoImage =  document.getElementById("loraInfoImage");
loraInfoImage.addEventListener('click', () => {
  toDataURL(loraInfoImage.src, function(dataUrl) {
    console.log('RESULT:', dataUrl)
    document.getElementById("imageDetailToggle").click();
    updateFullscreenImage(dataUrl);
  })
})
loraInfoImage.onerror = () => {
  if(!loraInfoImage.src.includes(".preview")){
    loraInfoImage.src = loraInfoImage.src.replace(".png", ".preview.png");
  }else{
    loraInfoImage.src = "img/card-no-preview";
  }
}

function toDataURL(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onload = function() {
    var reader = new FileReader();
    reader.onloadend = function() {
      callback(reader.result);
    }
    reader.readAsDataURL(xhr.response);
  };
  xhr.open('GET', url);
  xhr.responseType = 'blob';
  xhr.send();
}

removeImageButton.addEventListener('click', () => {
  maskImageBase64 = "";
  uploadedImageBase64 = "";
  document.getElementById("uploadedImage").src = "";
  document.getElementById("maskImage").src = "";
  document.getElementById("accordion-inpainting-options").classList.add("hidden");
  removeImageButton.classList.add("hidden");
  document.getElementById("imageOptions").classList.add("hidden");
  document.getElementById("imageUploadText").classList.remove("hidden");
  comfy_imagefile = null;
})
searchInput.addEventListener('input', (e) => {

  if(serverType != ServerType.Automatic1111){
    return;
}

  
  Search(e.target.value);
})

promptField.addEventListener('input', (e) => {
  UpdateLoraDisplays();
})

document.getElementById("ultimateUpscaleBtn").addEventListener('click', () => {
  uploadedImageBase64 = document.getElementById("outputImage").src.replace("data:image/png;base64,", "")
  generateImage(true, true);
})
document.getElementById("SDUpscaleBtn").addEventListener('click', () => {
  uploadedImageBase64 = document.getElementById("outputImage").src.replace("data:image/png;base64,", "")
  generateImage(true, false, true);
})

document.getElementById("outputImage").addEventListener('click', () => {
  document.getElementById("fullscreenPanel").classList.remove("hidden");
  document.getElementById("fullscreen_image").src = document.getElementById("outputImage").src;
  panzoom.reset();

});
//on esc
window.addEventListener('keydown', function(e) {
  if (e.key === "Escape") { // escape key maps to keycode `27`
    document.getElementById("fullscreenPanel").classList.add("hidden");
  }
  //on r
  if(e.key === "r"){
    panzoom.reset();
  }
}, true);

const elem = document.getElementById("fullscreen_image")
const panzoom = Panzoom(elem, {
  minScale:1,
  maxScale: 10,  
});

elem.parentElement.addEventListener('wheel', function (event) {
  panzoom.zoomWithWheel(event)
})

document.getElementById("closeFullscreenBtn").addEventListener('click', () => {
  document.getElementById("fullscreenPanel").classList.add("hidden");
});


let _url = GetBackendFromUrlString();

if (_url) {
  if (!_url.includes("http://", "https://",)) {
    // For links like 666eed1fa5f4e412ea -> https://666eed1fa5f4e412ea.gradio.live
    if (_url.length === 18 && !_url.includes('.', '_', '-', ' ',)) {
      gradioLink = "https://" + _url + ".gradio.live";
      url = gradioLink;
      urlInput.value = gradioLink;
    } else if (_url.length === 17 && !_url.includes('.', ' ', '/')) {
      // Do the same for ngrok-free.app links 8f34-34-82-52-121 -> https://8f34-34-82-52-121.ngrok-free.app/
      ngrokLink = "https://" + _url + ".ngrok-free.app/";
      url = ngrokLink;
      urlInput.value = ngrokLink;
    } else if (_url.split('-').length === 4) { //cloudflarelinks like tight-arrivals-double-respected -> https://tight-arrivals-double-respected.trycloudflare.com
      cloudFlareLink = "https://" + _url + ".trycloudflare.com";
      url = cloudFlareLink;
      urlInput.value = cloudFlareLink;
    } else {
      url = "http://" + _url;
      urlInput.value = url;
    }
  }
  else {
    url = _url;
    urlInput.value = _url;
  }
}

document.getElementById("loras-toggle").addEventListener('change', () => {
  
  const loras = document.getElementById("loraViewContainer");
  if(document.getElementById("loras-toggle").checked){
    loras.classList.remove("hidden");
  }else{
    loras.classList.add("hidden");}
})

if ('Notification' in window) {
  Notification.requestPermission()
      .then(permission => {

      });
}
//on arrow key press
window.addEventListener('keydown', function(e) {

  if(generatedImages.length == 0){
    return;
  }


  //check that the user is not typing in a text field
  if (e.target.nodeName != 'INPUT' && e.target.nodeName != 'TEXTAREA') {
    switch (e.keyCode) {
      case 37: //left arrow key
        
        current_image--;
        if(current_image < 0){
          current_image = generatedImages.length-1;
        }
        document.getElementById("outputImage").src = generatedImages[current_image];
        break;
      case 39: //right arrow key
        current_image++;
        if(current_image >= generatedImages.length){
          current_image = 0;
        }
        document.getElementById("outputImage").src = generatedImages[current_image];
        break;
    }
  }
});

$(document.getElementById("styles")).selectivity({
  items: ["Masterpiece","Painting","Negative"],
  multiple: true,
  placeholder: "Select styles",
})