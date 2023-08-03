// Select the aspect ratio slider element
const aspectRatioSlider = document.getElementById("aspectRatioSlider");
const aspectText = document.getElementById("arText");

// Event listener for batch size slider change
const batchSizeSlider = document.getElementById('batchSizeSlider');
const batchSizeValue = document.getElementById('batchSizeValue');

const downloadBtn = document.getElementById("downloadBtn");

const promptField = document.getElementById('prompt');

const urlInput = document.getElementById("urlInput");

const offlineBanner = document.getElementById("offlineBanner");
const connectingBanner = document.getElementById("connectingBanner");

const lorasContainer = document.getElementById('lorasContainer');

const weightSlider = document.getElementById("weightSlider");

const samplerDropdown = document.getElementById("sampling-method");

const seedDropdown = document.getElementById("seed-input");

const paintButton = document.getElementById("paintBtn");

const removeImageButton = document.getElementById("removeImageButton");

let selectedStyles = [];

let online = true;

let width = 512;
let height = 512;
let imageWidth = 0;
let imageHeight = 0;
let generatedImages = [""];
let uploadedImageBase64 = "";
let maskImageBase64 = "";

let categories = ["All"];

let currentLoras = [];
let loras = [];
let loraConfigs = {};

let currentCategory = "All";
let currentSubCategory = "";
let subCategory = 1;

let generatingAmount = 0;

let url = urlInput.value

let installDir = "";

let controlNetModel = "control_v11p_sd15_inpaint_fp16 [be8bc0ed]";
let controlnetModels = [];


// Image generation function
function generateImage() {

  checkStatus();
  const imageDisplay = document.getElementById('outputImage');
  const generateBtn = document.getElementById('generateBtn');
  generateBtn.disabled = true;
  generateBtn.textContent = "Generating...";
  document.getElementById("imgButtons").innerHTML = "";

  console.log("Generating image..." + document.getElementById('prompt').value);
  imageDisplay.src = "loading.gif";

  let img2img = uploadedImageBase64 != "";
  let isInpaint = maskImageBase64 != "";

  let maskMode = null;
  let maskedFill = null;
  let inpaintArea = null;
  let pixelsSliderValue = null;
  let useControlnet = null;


  if (isInpaint) {
    maskMode = document.querySelector('input[name="mask-mode"]:checked').value;
    maskedFill = document.querySelector('input[name="masked-fill"]:checked').value;
    inpaintArea = JSON.parse(document.querySelector('input[name="inpaint-area"]:checked').value);
    pixelsSliderValue = document.getElementById("pixels-slider").value;
    useControlnet = document.getElementById("use-controlnet").checked;
  }


  if (controlNetModel == null) {
    useControlnet = false;
  }

  const payload = {
    "prompt": document.getElementById('prompt').value,
    "negative_prompt": document.getElementById('negativePrompt').value,
    "steps": parseInt(stepsSlider.value),
    "width": width,
    "height": height,
    "sampler_name": samplerDropdown.value,
    "batch_size": parseInt(batchSizeSlider.value),
    "styles": selectedStyles,
    "cfg_scale": parseFloat(cfgSlider.value),
    "seed": parseInt(seedDropdown.value),
  };
  if (img2img) {
    payload["init_images"] = [uploadedImageBase64];
    payload["denoising_strength"] = parseFloat(weightSlider.value);
    payload["resize_mode"] = 1
    if (isInpaint) {
      payload["mask"] = maskImageBase64;
      payload["inpainting_fill"] = parseInt(maskedFill);
      payload["inpaint_full_res"] = inpaintArea;
      payload["inpaint_full_res_padding"] = parseInt(pixelsSliderValue);
      payload["inpainting_mask_invert"] = parseInt(maskMode);
      if (useControlnet) {
        payload["alwayson_scripts"] = {
          "controlnet": {
            "args": [
              {
                "module": "inpaint_only",
                "model": controlNetModel,
                // "control_mode": 2,
              }
            ]
          }
        };
      }
    }
  }

  console.log(JSON.stringify(payload, null, 2));

  api = url + '/sdapi/v1/txt2img';

  if (img2img) {
    api = url + '/sdapi/v1/img2img';
  }

  fetch(api, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
    .then(response => {
      if (!response.ok) {
        showMessage(response.error);
        throw new Error('Request failed');
      }
      return response.json();
    })
    .then(data => {

      if (data.error) {
        showMessage(data.error);
      }

      const imageDisplay = document.getElementById('outputImage');


      generatedImages = [];

      data.images.forEach((imageBase64, index) => {
        const imageURL = `data:image/png;base64, ${imageBase64}`;
        generatedImages.push(imageURL);
      });
      console.log("Finished generating " + generatedImages.length + " images");
      console.log(generatedImages);
      imageDisplay.src = generatedImages[0].toString();
      updateFullscreenImage(generatedImages[0].toString());

      const imgButtonContainer = document.getElementById("imgButtons");
      imgButtonContainer.innerHTML = "";

      generatedImages.forEach((imageSrc, index) => {
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
      });



      generateBtn.disabled = false;
      generateBtn.textContent = "Generate";
      document.getElementById("generatedImageOptions").classList.remove("hidden");
    })
    .catch(error => {
      showMessage(error)
      console.error('Error:', error);
      generateBtn.disabled = false;
      generateBtn.textContent = "Generate";
    });


}

function updateFullscreenImage(base64) {
  document.getElementById("fullscreenImage").src = `${base64}`;
  const info = document.getElementById("fullscreenInfo");

  const payload = {
    "image": base64.replace("data:image/png;base64,", ""),
  }

  fetch(url + "/sdapi/v1/png-info", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  }).then(response => {
    if (!response.ok) {
      showMessage(response.error);
      throw new Error('Request failed');
    }
    return response.json();
  }).then(data => {
      console.log(data)
      words = ["Negative prompt","Steps","Sampler","CFG scale","Seed","Size","Model hash","Model","Denoising strength","Clip skip","ENSD","TI hashes","Version","Lora hashes"];

      info.innerHTML =boldWords("<strong>Prompt</strong>:"+data["info"],words);
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

async function GetControlnetModel(name) {
  try {
    const response = await fetch(url + '/controlnet/model_list');
    const data = await response.json();
    const modelList = data.model_list;

    // Find the model that includes the provided name
    const matchingModel = modelList.find(model => model.includes(name));
    console.log("Found controlnet model: " + matchingModel);
    controlNetModel = matchingModel; // Return the matching model or null if not found
  } catch (error) {
    console.error('Error fetching model list:', error);
  }
}


// Function to handle the aspect ratio slider change event
function handleAspectRatioChange() {



  // Get the value of the aspect ratio from the slider
  const aspectRatio = aspectRatioSlider.value;

  if (aspectRatio == 1) {
    width = 512;
    height = 512;
  }
  else if (aspectRatio == 1.5) {
    width = 512;
    height = 640;
  }
  else if (aspectRatio == 2) {
    width = 512;
    height = 768;
  }
  else if (aspectRatio == 0.5) {
    width = 640;
    height = 512;
  } else if (aspectRatio == 0) {
    width = 768;
    height = 512;
  }


  // Update the aspect ratio text
  aspectText.textContent = `Resolution: ${width}x${height}`;


  // Use the aspect ratio value as needed (replace this with your actual implementation)
  console.log("Aspect Ratio:", aspectRatio);
}




function addLoraEntry(imageSrc, name, category) {
  // Create the necessary HTML elements
  const entryDiv = document.createElement('div');
  entryDiv.classList.add('group', 'relative', 'lora');
  entryDiv.id = name;

  const imageDiv = document.createElement('div');
  imageDiv.classList.add('aspect-h-1', 'aspect-w-1', 'w-full', 'overflow-hidden', 'rounded-md', 'bg-gray-200', 'lg:aspect-none', 'group-hover:opacity-75', 'lg:h-100',);//border-4

  const image = document.createElement('img');
  image.src = imageSrc;
  image.alt = 'Lora Thumbnail';
  image.classList.add('h-full', 'w-full', 'object-cover', 'object-center', 'lg:w-full', 'max-h-768');
  image.onerror = () => {
    if(!image.src.includes(".preview")){
      image.src = image.src.replace(".png", ".preview.png");
    }else{
      image.src = "img/card-no-preview.png";
    }

  }

  const infoDiv = document.createElement('div');
  infoDiv.classList.add('mt-4');

  const nameHeading = document.createElement('h3');
  nameHeading.classList.add('text-sm', 'text-gray-700');

  const nameLink = document.createElement('a');
  nameLink.href = '#';

  const nameSpan = document.createElement('span');
  nameSpan.classList.add('absolute', 'inset-0');

  const nameText = document.createTextNode(name);

  const categoryParagraph = document.createElement('p');
  categoryParagraph.classList.add('mt-1', 'text-sm', 'text-gray-500');
  categoryParagraph.textContent = category.replaceAll("\\","/");

  // Add click event listener to the entry
  entryDiv.addEventListener('click', function () {
    event.preventDefault(); // Prevent default link behavior
    handleLoraEntryClick(name, category);
  });

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
  lorasContainer.appendChild(entryDiv);
}

// Event handler for Lora entry click
function handleLoraEntryClick(name, category) {
  console.log('Lora Entry Clicked:', name, category);

  UpdateLoraDisplays();

  if (isLoraInPrompt(name)) {
    removeLoraFromPrompt(name);
    UpdateLoraDisplays();
    return;
  }


  let lora = getLoraByName(name);

  if (lora) {
    console.log("Found Lora:", lora);
  } else {
    console.log("Lora not found.");
  }

  fetch(url + '/file=' + lora.config)
    .then(response => response.json())
    .then(data => {

      lora = getLoraByName(name);

      
      let text = data["activation text"];
      let weight = data["preferred weight"];

      if (weight == 0 || weight == null) {
        weight = 1;
      }
      if (text == null) {
        text = "";
      }
      if(lora.isLyco == true) {
        promptField.value += `<lyco:${name}:${weight}> ${text}`;
      }else if(lora.isHypernet){
        promptField.value += `<hypernet:${name}:1>`;
      }else{
        promptField.value += `<lora:${name}:${weight}> ${text}`;
      }
      

      UpdateLoraDisplays();

    }).catch(error => {
      lora = getLoraByName(name);
      console.log("Lora config " + lora.config + " not found.");
      if(lora.isLyco){
        promptField.value += `<lyco:${name}:1>`;
      }else if(lora.isHypernet){
        promptField.value += `<hypernet:${name}:1>`;
      }
      else{
        promptField.value += `<lora:${name}:1>`;
      }
      UpdateLoraDisplays();

    })



}

function getLoraConfigByName(name) {
  return loraConfigs[name];

}
function UpdateAllLoraConfigs() {

  loraConfigs = {};

  loras.forEach(lora => {
    fetch(url + '/file=' + lora.config)
      .then(response => response.json())
      .then(data => {
        loraConfigs[lora.name] = data;
      }).catch(error => {

      })
  });
}


function isLoraInPrompt(name) {
  const regex = new RegExp(`<(?:lora|lyco|hypernet):${name}:-?[0-9]+(\\.[0-9]+)?>`, 'g');
  return regex.test(promptField.value);
}

function ChangeLoraWeight(name, weight) {
  const regex = new RegExp(`(<(?:lora|lyco|hypernet):${name}:)(-?[0-9]+(\\.[0-9]+)?>)`, 'g');
  promptField.value = promptField.value.replace(regex, `$1${weight}>`);
}

function removeLoraFromPrompt(name) {
  const regex = new RegExp(`<(?:lora|lyco|hypernet):${name}:-?[0-9]+(\\.[0-9]+)?>`, 'g');
  promptField.value = promptField.value.replace(regex, '');

  const config = getLoraConfigByName(name);
  if (config != null) {
    const activationText = config["activation text"]
    if (activationText != null) {
      promptField.value = promptField.value.replace(activationText, "");
    }
  }
}


// Function to get the weight of a Lora element
// Function to get the weight of a Lora element
function GetLoraWeight(name) {
  const regex = new RegExp(`<lora:${name}:(-?[0-9]+(\\.[0-9]+)?)>`);
  const match = promptField.value.match(regex);

  if (match) {
    console.log(match);
    return parseFloat(match[1]);
  }

  // Return a default weight (or null) if the Lora element is not found
  return 0;
}

function UpdateLoraDisplays() {
  var container = document.getElementById("lorasContainer");
  var elements = container.querySelectorAll(".lora");

  currentLoras = [];

  for (var i = 0; i < elements.length; i++) {
    var element = elements[i];
    if (isLoraInPrompt(element.id)) {
      currentLoras.push(element.id);
      const imgElement = element.querySelector("img"); // Assuming the <img> element is the first child
      if (imgElement) {
        imgElement.classList.add("border-4");
        imgElement.classList.add("border-blue-500");
      }
    } else {
      element.classList.remove("border-4");
      element.classList.remove("border-blue-500");
      const imgElement = element.querySelector("img"); // Assuming the <img> element is the first child
      if (imgElement) {
        imgElement.classList.remove("border-4");
        imgElement.classList.remove("border-blue-500");
      }
    }

  }
  addLoraSliders(currentLoras);
}


function HandleLoras() {

  const container = document.getElementById("lorasContainer");
  container.innerHTML = "";
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  categories = ["All"];

  fetch(url + '/sdapi/v1/loras')
    .then(response => response.json())
    .then(data => {

      // Loop through the response content
      data.forEach(item => {
        // Access the properties of each item
        let lyco = item.path.includes("LyCORIS");

        const name = item.name;
        let path = item.path;
        // Convert the path to URL format
        //path = path.replace(":\\", "%3A/");
        path = url + '/file=' + path;
        path = path.replace('.safetensors', '.png');
        path = path.replace('.ckpt', '.png');
        path = path.replace('.pt', '.png');
        path = path.replace("\\", "/");

        let folder = path.substring(path.lastIndexOf('/') + 1, path.lastIndexOf('.'));

        folder = item.path.replace(installDir, "");
        folder = folder.replace("/", "\\");
        folder = folder.replace("\\" + name, "");
        folder = folder.replace("models\\Lora\\", "");
        folder = folder.replace("models\\","");
        folder = folder.replace("LyCORIS\\", "");
        folder = folder.replace(".safetensors", "");
        folder = folder.replace(".ckpt", "");
        folder = folder.replace(".pt", "");
        folder = folder.replace("\\", "");

        let folders = folder.split("\\");
        i = 0;
        fullFolder = "";
        for (; i < folders.length - 1; i++) {
          if (i == 0) {
            fullFolder += folders[i];

          } else {
            fullFolder += "\\" + folders[i];
          }
          if (!categories.includes(fullFolder)) {
            categories.push(fullFolder);
          }
        }


        if (!categories.includes(folder)) {
          categories.push(folder);
        }


        if (installDir != "") {



          let _lora = new LoraData(
            name, //name
            item.alias, //alias
            item.path,//path
            path,//image
            folder, //category
            item.path.replace(installDir + "\\", "").replace(".safetensors", ".json"), //config
            lyco, //lycoris
            false, //isHypernetwork
          );

          loras.push(_lora);

          AddCategoryButtons();
          addLoraEntry(path, name, folder);
        } else {
          addLoraEntry(path, name, "");
        }




        // Do something with the data
        console.log("Path:", path);
        console.log("Category:", folder);
      });

      console.log("Loras:", loras);
      HandleHypernetworks();
    })
    .catch(error => {
      showMessage(error);
      console.error('Error:', error);
    });
}

function HandleHypernetworks() {

  const container = document.getElementById("lorasContainer");

  fetch(url + '/sdapi/v1/hypernetworks')
    .then(response => response.json())
    .then(data => {

      // Loop through the response content
      data.forEach(item => {
        // Access the properties of each item
        let lyco = item.path.includes("LyCORIS");

        const name = item.name;
        let path = item.path;
        // Convert the path to URL format
        path = url + '/file=' + path;
        path = path.replace('.safetensors', '.png');
        path = path.replace('.ckpt', '.png');
        path = path.replace('.pt', '.png');
        path = path.replace("\\", "/");

        let folder = path.substring(path.lastIndexOf('/') + 1, path.lastIndexOf('.'));

        folder = item.path.replace(installDir, "");
        folder = folder.replace("/", "\\");
        folder = folder.replace("\\" + name, "");
        folder = folder.replace("models\\Lora\\", "");
        folder = folder.replace("models\\","");
        folder = folder.replace("hypernetworks\\", "");
        folder = folder.replace(".safetensors", "");
        folder = folder.replace(".ckpt", "");
        folder = folder.replace(".pt", "");
        folder = folder.replace("\\", "");

        let folders = folder.split("\\");
        i = 0;
        fullFolder = "";
        for (; i < folders.length - 1; i++) {
          if (i == 0) {
            fullFolder += folders[i];

          } else {
            fullFolder += "\\" + folders[i];
          }
          if (!categories.includes(fullFolder)) {
            categories.push(fullFolder);
          }
        }


        if (!categories.includes(folder)) {
          categories.push(folder);
        }


        if (installDir != "") {



          let _lora = new LoraData(
            name, //name
            name, //alias
            item.path,//path
            path,//image
            folder, //category
            item.path.replace(installDir + "\\", "").replace(".safetensors", ".json").replace(".pt",".json"), //config
            false, //lycoris
            true
          );

          loras.push(_lora);

          AddCategoryButtons();
          addLoraEntry(path, name, folder);
        } else {
          addLoraEntry(path, name, "");
        }




        // Do something with the data
        console.log("Path:", path);
        console.log("Folder:", folder);
      });

      console.log("Hypernetworks:", loras);

      UpdateAllLoraConfigs();
    })
    .catch(error => {
      showMessage(error);
      console.error('Error:', error);
    });
}

function AddCategoryButtons() {
  const categoriesContainer = document.getElementById('categories');

  // Clear the existing buttons
  categoriesContainer.innerHTML = '';

  // Create and add category buttons
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
      else {
        button.classList.add('bg-gray-500');
      }
      button.addEventListener('click', () => handleCategoryClick(category));
      categoriesContainer.appendChild(button);
    }


  });
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

function handleCategoryClick(category) {
  console.log('Category clicked:', category);
  currentCategory = category;
  subCategory = category.split("\\").length;

  AddCategoryButtons();

  var container = document.getElementById("lorasContainer");
  var elements = container.querySelectorAll(".lora");

  for (var i = 0; i < elements.length; i++) {
    var element = elements[i];

    if (category == "All") {
      element.classList.remove("hidden");
    } else {
      loraCategory = getLoraByName(element.id).category;

      if (loraCategory.includes(category)) {
        element.classList.remove("hidden");
      } else {
        element.classList.add("hidden");
      }
    }
  }
}

function Search(searchTerm) {
  var container = document.getElementById("lorasContainer");
  var elements = container.querySelectorAll(".lora");

  for (var i = 0; i < elements.length; i++) {
    var element = elements[i];

   
      loraName = element.id;

      loraName = element.id.toLowerCase();
      _searchTerm = searchTerm.toLowerCase();
      _searchTerm = _searchTerm.trim();
      _searchTerm = _searchTerm.replaceAll(" ","")
      loraName = loraName.replaceAll(" ", "");
      loraName = loraName.replaceAll("_", "");
      loraName = loraName.replaceAll("-","");


      if (loraName.includes(_searchTerm) || element.id.toLowerCase().includes(searchTerm.toLowerCase()) || getLoraByName(element.id).category.toLowerCase().includes(searchTerm.toLowerCase())) {
        element.classList.remove("hidden");
      } else {
        element.classList.add("hidden");
      }
    }
  
}

function handleURLChange() {
  url = urlInput.value
  checkStatus();
  HandleLoras();
  changeCode(url);
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
      HandleLoras();
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
    dropdown.appendChild(label);
  }
}

function updateStyles() {
  dropdown.innerHTML = "";
  fetch(url + '/sdapi/v1/prompt-styles')
    .then(response => response.json())
    .then(data => {
      data.forEach(style => {
        addStyleToDropdown(style.name);
      });

      // After adding styles, attach event listeners to the checkboxes
      const styleCheckboxes = document.querySelectorAll('#stylesDropdown input[type="checkbox"]');
      selectedStyles = [];

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

          // You can perform any action with the selectedStyles array here.
          console.log('Selected Styles:', selectedStyles);
        });
      });
    });
}

// Call updateStyles() to fetch and populate styles initially
updateStyles();
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
      UploadImage(reader.result);
    };
    reader.readAsDataURL(file);
  }
});
//#endregion

function UploadImage(source) {
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
    const width = imgElement.naturalWidth;
    const height = imgElement.naturalHeight;
    console.log("Image Resolution:", width, "x", height);
    document.getElementById("imagesizeText").textContent = "Size: " + width + "x" + height;
    imageWidth = width;
    imageHeight = height;
    // Now you can use 'width' and 'height' for your desired purpose.
  };

  uploadedImage.classList.remove('hidden');
  document.getElementById("imageUploadText").classList.add("hidden");
  document.getElementById("imageOptions").classList.remove("hidden");
  document.getElementById("accordion-open-body-3").classList.remove("hidden");
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







function Download() {
  var a = document.createElement("a"); //Create <a>
  a.href = document.getElementById("outputImage").src //Image Base64 Goes here
  a.download = "Image.png"; //File name Here
  a.click(); //Downloaded file
}


async function checkStatus() {

  offlineBanner.classList.add("hidden")
  connectingBanner.classList.remove("hidden");

  let online = false;

  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (response.status === 200) {
      console.log("Online");
      online = true;
    }
  } catch (error) {
    console.log("Offline");
    online = false;
  }


  // Show the offline banner if the connection is not successful
  if (!online) {
    offlineBanner.classList.remove("hidden");
  } else {
    offlineBanner.classList.add("hidden");
  }
  connectingBanner.classList.add("hidden");

}

function GetBackendFromUrlString() {
  const currentURL = window.location.href;
  const queryStringIndex = currentURL.indexOf('?');
  if (queryStringIndex !== -1) {
    return currentURL.slice(queryStringIndex + 1);
  } else {
    return null; // Return null if there's no query string in the URL
  }
}
function isLocalhost(url) {
  const hostname = new URL(url).hostname;
  return /^localhost|^127(?:\.[0-9]+){0,2}\.[0-9]+$|^\[::1\]$/.test(hostname);
}
function changeCode(newCode) {
  // const currentURL = new URL(window.location.href);
  // currentURL.searchParams.set(newCode);
  // window.history.replaceState({}, '', currentURL);
}

function showMessage(message, duration = 5000) {
  const targetEl = document.getElementById('errorMessage');
  targetEl.innerText = message;

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



class LoraData {
  name = "";
  alias = "";
  path = "";
  image = "";
  category = "";
  config = "";
  isLyco = false;
  isHypernet = false;
  constructor(name, alias, path, image, category, config, isLyco, isHypernet = false) {
    this.name = name;
    this.alias = alias;
    this.path = path;
    this.image = image;
    this.category = category;
    this.config = config;
    this.isLyco = isLyco;
    this.isHypernet = isHypernet;
  }
}
const stepsSlider = document.getElementById("steps-slider");
const stepsValue = document.getElementById("steps-value");
const cfgSlider = document.getElementById("scale-slider");
const cfgValue = document.getElementById("scale-value");

// Event listener for generate button
const generateBtn = document.getElementById('generateBtn');
generateBtn.addEventListener('click', generateImage);
aspectRatioSlider.addEventListener("input", handleAspectRatioChange);
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
cfgSlider.addEventListener('input', () => {
  // Update the steps value label
  cfgValue.textContent = "CFG Scale: " + cfgSlider.value;
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

removeImageButton.addEventListener('click', () => {
  maskImageBase64 = "";
  uploadedImageBase64 = "";
  document.getElementById("uploadedImage").src = "";
  document.getElementById("maskImage").src = "";
  document.getElementById("accordion-inpainting-options").classList.add("hidden");
  removeImageButton.classList.add("hidden");
  document.getElementById("imageOptions").classList.add("hidden");
  document.getElementById("imageUploadText").classList.remove("hidden");
})
searchInput.addEventListener('input', (e) => {
  Search(e.target.value);
})

let _url = GetBackendFromUrlString();



if(_url) {
  

  if(!_url.includes("http://","https://",)) {
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
    } else if(_url.split('-').length === 4){ //cloudflarelinks like tight-arrivals-double-respected -> https://tight-arrivals-double-respected.trycloudflare.com
      cloudFlareLink = "https://" + _url + ".trycloudflare.com";
      url = cloudFlareLink;
      urlInput.value = cloudFlareLink;
    }else{
      url = "http://" + _url;
      urlInput.value = url;
    }
  }
  else {
    url = _url;
    urlInput.value = _url;
  }

}

GetControlnetModel("inpaint");
handleURLChange();
GetDataDir();
checkStatus();
