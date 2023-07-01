
// Select the aspect ratio slider element
const aspectRatioSlider = document.getElementById("aspectRatioSlider");

const aspectText = document.getElementById("arText");

const downloadBtn = document.getElementById("downloadBtn");

const promptField = document.getElementById('prompt');

let online = true;

let width = 512;
let height = 512;
let generatedImage = "";

let categories = ["All"];

let generatingAmount = 0;

let url = "http://192.168.1.114:8080";

// Image generation function
function generateImage() {

  checkStatus();
  const imageDisplay = document.getElementById('imageDisplay');
  const generateBtn = document.getElementById('generateBtn');
  generateBtn.disabled = true;
  generateBtn.textContent = "Generating...";
  
  console.log("Generating image..." + document.getElementById('prompt').value );
  imageDisplay.innerHTML = `<img src="loading.gif" alt="Loading" class="w-full">`;
  
  const payload = {
    "prompt": document.getElementById('prompt').value,
    "negative_prompt": document.getElementById('negativePrompt').value,
    "steps": 20,
    "width": width,
    "height": height,
    "sampler_name":"Euler a"
  };
  
  fetch(url+'/sdapi/v1/txt2img', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})
  .then(response => {
    if (!response.ok) {
      throw new Error('Request failed');
    }
    return response.json();
  })
  .then(data => {
    const imageBase64 = data.images[0]; // Assuming there is only one image in the response
    const imageURL = `data:image/png;base64, ${imageBase64}`;
    generatedImage = imageURL;

    
    imageDisplay.innerHTML = `<img src="${imageURL}" alt="Generated Image" class="w-full">`;

    generateBtn.disabled = false;
    generateBtn.textContent = "Generate";
    document.getElementById("downloadBtn").classList.remove("hidden");
  })
  .catch(error => {
    console.error('Error:', error);
    generateBtn.disabled = false;
    generateBtn.textContent = "Generate";
  });


}

// Function to handle the aspect ratio slider change event
function handleAspectRatioChange() {



  // Get the value of the aspect ratio from the slider
  const aspectRatio = aspectRatioSlider.value;

  if(aspectRatio == 1) {
    width = 512;
    height = 512;
  }
  else if (aspectRatio == 1.5) {
    width = 512;
    height = 640;
  }
  else if(aspectRatio == 2) {
     width = 512;
     height = 768;
  }
  else if(aspectRatio == 0.5) {
    width = 640;
    height = 512;
  }else if (aspectRatio == 0) {
    width = 768;
    height = 512;
  }


  // Update the aspect ratio text
  aspectText.textContent = `Aspect Ratio: ${width}x${height}`;
  

  // Use the aspect ratio value as needed (replace this with your actual implementation)
  console.log("Aspect Ratio:", aspectRatio);
}

function addLoraEntry(imageSrc, name, category) {
  // Create the necessary HTML elements
  const entryDiv = document.createElement('div');
  entryDiv.classList.add('group', 'relative','lora');
  entryDiv.id = category;
  
  const imageDiv = document.createElement('div');
  imageDiv.classList.add('aspect-h-1', 'aspect-w-1', 'w-full', 'overflow-hidden', 'rounded-md', 'bg-gray-200', 'lg:aspect-none', 'group-hover:opacity-75', 'lg:h-100');
  
  const image = document.createElement('img');
  image.src = imageSrc;
  image.alt = 'Lora Thumbnail';
  image.classList.add('h-full', 'w-full', 'object-cover', 'object-center', 'lg:w-full','max-h-768');
  
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
  categoryParagraph.textContent = category;
  
  // Add click event listener to the entry
  entryDiv.addEventListener('click', function() {
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
  const lorasContainer = document.getElementById('lorasContainer');
  lorasContainer.appendChild(entryDiv);
}

// Event handler for Lora entry click
function handleLoraEntryClick(name, category) {
  console.log('Lora Entry Clicked:', name, category);
  // You can perform any additional actions here based on the clicked entry
  promptField.value += "<lora:" +name +":1>"
}

function HandleLoras() {
  fetch(url+'/sdapi/v1/loras')
  .then(response => response.json())
  .then(data => {
    // Loop through the response content
    data.forEach(item => {
      // Access the properties of each item
      const name = item.name;
      let path = item.path;
      // Convert the path to URL format
      path = path.replace('D:\\', url+'/sd_extra_networks/thumb?filename=D%3A/');
      path = path.replace('.safetensors', '.png');
      path = path.replace("\\","/");
      
      let folder = path.substring(path.lastIndexOf('/') + 1, path.lastIndexOf('.'));

      folder = folder.replace("stable-diffusion-webui-ux\\models\\Lora\\","");
      folder = folder.replace(name,"");
      folder = folder.replace("\\","");

      if(!categories.includes(folder)) {
        categories.push(folder);
      }
      AddCategoryButtons();

      addLoraEntry(path, name, folder);

      // Do something with the data
      console.log("Path:", path);
      console.log("Folder:", folder);
  

    });
  })
  .catch(error => {
    console.error('Error:', error);
  });
}
function AddCategoryButtons() {
  const categoriesContainer = document.getElementById('categories');

  // Clear the existing buttons
  categoriesContainer.innerHTML = '';

  // Create and add category buttons
  categories.forEach(category => {
    const button = document.createElement('button');
    button.textContent = category;
    button.classList.add('px-4', 'py-2', 'text-white', 'bg-blue-500', 'rounded', 'mr-2', 'mb-2');
    button.addEventListener('click', () => handleCategoryClick(category));
    categoriesContainer.appendChild(button);
  });
}


function handleCategoryClick(category) {
  console.log('Category clicked:', category);
  var container = document.getElementById("lorasContainer");
  var elements = container.querySelectorAll(".lora");

  for (var i = 0; i < elements.length; i++) {
    var element = elements[i];

    if (category == "All") {
      element.classList.remove("hidden");
    } else {
      if (element.id != category) {
        element.classList.add("hidden");
      } else {
        element.classList.remove("hidden");
      }
    }
  }
}



// Example usage: adding a new Lora entry
const imageSrc = 'http://example.com/image.jpg';
const name = 'Lora Name';
const category = 'Lora Category';







function Download() {
  var a = document.createElement("a"); //Create <a>
  a.href = generatedImage //Image Base64 Goes here
  a.download = "Image.png"; //File name Here
  a.click(); //Downloaded file
}


async function checkStatus() {
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

  // Select the offline banner element
  const offlineBanner = document.getElementById("offlineBanner");

  // Show the offline banner if the connection is not successful
  if (!online) {
    offlineBanner.classList.remove("hidden");
  }else{
    offlineBanner.classList.add("hidden");
  }
}



// Event listener for generate button
const generateBtn = document.getElementById('generateBtn');
generateBtn.addEventListener('click', generateImage);
aspectRatioSlider.addEventListener("input", handleAspectRatioChange);
downloadBtn.addEventListener("click", Download);
HandleLoras();
checkStatus();
