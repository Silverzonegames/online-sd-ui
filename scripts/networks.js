
let lorasHandled = false;
function HandleLoras() {
  

  if(lorasHandled){
    return;
  }
  lorasHandled = true;

  const container = document.getElementById("lorasContainer");
  container.innerHTML = "";
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  categories = ["All"];

  let apis = ["/sdapi/v1/loras","/sdapi/v1/hypernetworks"];

  for (let i = 0; i < apis.length; i++) {
    let isHyperNetwork = apis[i].includes("hypernetworks");

    fetch(url + apis[i])
    .then(response => response.json())
    .then(data => {

      // Loop through the response content
      data.forEach(item => {
        // Access the properties of each item
        let lyco = item.path.includes("LyCORIS");

        
        if(isHyperNetwork){
          lyco = false;
        }

        const name = item.name;
        let path = item.path;

        // Convert the path to URL format
        path = url + '/file=' + path;
        path = path.replace('.safetensors', '.png');
        path = path.replace('.ckpt', '.png');
        path = path.replace('.pt', '.png');
        path = path.replaceAll("\\", "/");


        let folder = item.path;
        folder = folder.replace("/", "\\"); //change linux / to windows \
        folder = folder.split("\\models\\")[1];
        folder = folder.replace("\\" + name, "");
        folder = folder.replace("Lora\\", "");
        folder = folder.replace("LyCORIS\\", "");
        folder = folder.replace("hypernetworks\\", "");
        folder = folder.replace(".safetensors", "");
        folder = folder.replace(".ckpt", "");
        folder = folder.replace(".pt", "");

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


        if (item.path != "") {



          let _lora = new LoraData(
            name, //name
            item.alias, //alias
            item.path,//path
            path,//image
            folder, //category
            "models\\"+item.path.split("\\models\\")[1].replace(".safetensors", ".json").replace(".pt",".json"), //config
            lyco, //lycoris
            isHyperNetwork, //isHypernetwork
            item.metadata //metadata
          );

          loras.push(_lora);

          AddCategoryButtons();
          addLoraEntry(path, name, folder);
        } else {
          addLoraEntry(path, name, "");
        }

      });
      UpdateAllLoraConfigs();
      UpdateLoraDisplays();
      console.log(apis[i]+": "+ loras);
    })
    .catch(error => {
      showMessage(error);
      console.error('Error:', error);
    });

  }


}


function addLoraEntry(imageSrc, name, category) {
    // Create the necessary HTML elements
    const entryDiv = document.createElement('div');
    entryDiv.classList.add('group', 'relative', 'lora');
    entryDiv.id = name;
  
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('bg-white', 'border', 'border-gray-200', 'rounded-lg', 'shadow', 'dark:bg-gray-800', 'dark:border-gray-700');

    const imageDiv = document.createElement('div');
    imageDiv.classList.add(
        'overflow-hidden', 'rounded-t-lg'
    );

    const image = document.createElement('img');
    image.src = imageSrc;
    image.alt = 'Lora Thumbnail';
    image.classList.add('object-cover', 'object-center', 'w-full','aspect-[2/3]');

    image.onerror = () => {
      if (!image.src.includes(".preview")) {
        image.src = image.src.replace(".png", ".preview.png");
      } else {
        image.src = "img/card-no-preview.png";
      }
    };
  
    const infoDiv = document.createElement('div');
    infoDiv.classList.add('mt-4');
    infoDiv.style.cursor = "pointer";
  
    const nameHeading = document.createElement('h3');
    nameHeading.classList.add('text-sm', 'text-gray-700');
  
    const nameLink = document.createElement('a');
    nameLink.classList.add("mb-2", "text-xl", "font-bold", "tracking-tight", "text-gray-900", "dark:text-white", "whitespace-normal", "break-words","max-h-4", "overflow-hidden");

    const nameSpan = document.createElement('span');
    //nameSpan.classList.add('absolute', 'inset-0');
  
    const nameText = document.createTextNode(name);
  
    const categoryParagraph = document.createElement('p');
    categoryParagraph.classList.add('mt-1','ml-2', 'text-sm', 'text-gray-500');
    categoryParagraph.textContent = category.replaceAll("\\", "/");
  
    // Add click event listener to the imageDiv
    imageDiv.addEventListener('click', function (event) {
      handleLoraEntryClick(name, category);
      event.preventDefault(); // Prevent default link behavior
    });
  
    // Add click event listener to the nameLink
    infoDiv.addEventListener('click', function (event) {
      event.preventDefault(); // Prevent default link behavior
      ShowLoraInfo(name, imageSrc);
    });
    infoDiv.setAttribute('data-modal-target', 'loraInfoModal');
    infoDiv.setAttribute('data-modal-toggle', 'loraInfoModal');
  
    // Append the elements to their respective parent elements
    contentDiv.appendChild(imageDiv);
    imageDiv.appendChild(image);
  
    contentDiv.appendChild(infoDiv);
    infoDiv.appendChild(nameHeading);
  
    nameHeading.appendChild(nameLink);
    nameLink.appendChild(nameSpan);
    nameLink.appendChild(nameText);
  
    infoDiv.appendChild(categoryParagraph);

    entryDiv.appendChild(contentDiv);
  
    // Append the entry to the container element
    const lorasContainer = document.getElementById('lorasContainer');
    lorasContainer.appendChild(entryDiv);
  }
  
  
  
  function ShowLoraInfo(name, imgsrc) {
    console.log('Show Lora info:', name);
    currentLoraInfo = name;
  
  
    //update image
    document.getElementById("loraInfoImage").src = imgsrc;
    //update title
    document.getElementById("loraName").textContent = name;
  
  
    if(isLoraInPrompt(name)){
      document.getElementById("loraUseBtn").textContent = "Remove";
    }else{
      document.getElementById("loraUseBtn").textContent = "Add";
    }
  
    const loraDesc = document.getElementById("loraDesc");
    const loraMetadata = document.getElementById("loraMetadata");
    const loraActivationText = document.getElementById("loraActivationText");
    const loraPreferredWeight = document.getElementById("loraPreferredWeight");
    const loraNotes = document.getElementById("loraNotes");
    const loraNotesContainer = document.getElementById("loraNotesContainer");
    const loraLink = document.getElementById("loraLink");
    const loraCivitDesc = document.getElementById("loraCivitDesc");
    const loraCivitDescContainer = document.getElementById("loraCivitDescContainer");
  
    const lora = getLoraByName(name);
  
    loraDesc.textContent = "";
    loraMetadata.innerHTML = "";
    loraActivationText.textContent = "";
    loraPreferredWeight.textContent = "";
    loraNotes.textContent = "";
    loraNotesContainer.classList.add("hidden");
    loraCivitDesc.innerHTML = "";
    loraCivitDescContainer.classList.add("hidden");
    fetch(url + '/file=' + lora.config)
      .then(response => response.json())
      .then(data => {
        console.log(data);
  
        loraDesc.innerHTML = data["description"];
  
        tags = GetActivationTags(data["activation text"]);
  
        tags.forEach(tag => {
          loraActivationText.innerHTML+='<code class="bg-blue-500">'+tag+"</code> ";
        });
        AddCodeBlockButtons(loraActivationText);
  
  
  
        if (data["preferred weight"] == 0) {
          loraPreferredWeight.textContent = "Not Set";
        } else {
          loraPreferredWeight.textContent = data["preferred weight"];
        }
        loraNotes.innerHTML = data["notes"].replaceAll("\n", "<br>");
        if(data["notes"] != ""){
          loraNotesContainer.classList.remove("hidden");
        }
        AddCodeBlockButtons(loraNotes);
  
        AddMetaData("SD Version", data["sd version"]);
  
        if (lora.metadata["ss_sd_model_name"]) {
          AddMetaData("Model", lora.metadata["ss_sd_model_name"]);
        }
        if (lora.metadata["ss_clip_skip"]) {
          AddMetaData("Clip Skip", lora.metadata["ss_clip_skip"]);
        }
  
      });
  
    
    fetch(url + '/file=' + lora.config.replace(".json",".civitai.info"))
    .then(response => response.json())
    .then(data => {
  
      if(data["modelId"] == null){
        loraLink.classList.add("hidden");
  
      }else{
        loraLink.classList.remove("hidden");
        loraLink.href="https://civitai.com/models/"+data["modelId"]+"?modelVersionId="+data["id"]

        fetch("https://civitai.com/api/v1/models/"+data["modelId"])
        .then(response => response.json())
        .then(modelData => {
          if(modelData){
            loraCivitDesc.innerHTML = modelData["description"];
            loraCivitDescContainer.classList.remove("hidden");
          }
        })

      }
    }).catch(error => {
      loraLink.classList.add("hidden");
    });
  
    console.log(lora.metadata);
    document.getElementById("datasetTags").innerHTML = "";
    // Extract tags and counts from the data and add them to the container, sorted by highest count and limited to 25
    if (lora.metadata["ss_tag_frequency"]) {
      build_tags(lora.metadata)
      document.getElementById("datasetTagsContainer").classList.remove("hidden")
  
    }else{
      document.getElementById("datasetTagsContainer").classList.add("hidden");
  
    }
  
    //show modal
    document.getElementById("loraModalToggle").click();
  }
  
  function AddCodeBlockButtons(element) {
    const codeBlocks = element.querySelectorAll("code");
    codeBlocks.forEach(codeBlock => {
      codeBlock.style.cursor = "pointer"; // Change cursor to indicate it's clickable
  
      UpdateCodeBlocks(element);
  
      codeBlock.addEventListener("click", () => {
          // Print the code block's text content to the console
          console.log(codeBlock.textContent);
  
          if(IsInPrompt(codeBlock.textContent, true,true)){
            RemoveFromPrompt(codeBlock.textContent);
          }else{
            AddToPrompt(codeBlock.textContent,true,true);
          }
          UpdateCodeBlocks(element);
      });
    });
  }
  function UpdateCodeBlocks(element){
    const codeBlocks = element.querySelectorAll("code");
    codeBlocks.forEach(codeBlock => {
      codeBlock.style.cursor = "pointer"; // Change cursor to indicate it's clickable
  
      if(IsInPrompt(codeBlock.textContent,true,true)){
        codeBlock.classList.add("border-2");
      }else{
        codeBlock.classList.remove("border-2");
      }
    });
  }
  
  function AddMetaData(data, value) {
    const loraMetadata = document.getElementById("loraMetadata");
  
    // Create a new paragraph element to hold the metadata and its value
    const metadataContainer = document.createElement("p");
    metadataContainer.classList.add("border-b-2");
  
    // Create a "b" element for the metadata label
    const metadataLabel = document.createElement("b");
    metadataLabel.textContent = data + ": ";
  
    // Create a "span" element for the metadata value
    const metadataValueElement = document.createElement("span");
    metadataValueElement.textContent = value;
  
    // Append the metadata label and value to the container
    metadataContainer.appendChild(metadataLabel);
    metadataContainer.appendChild(metadataValueElement);
  
    // Append the container to the loraMetadata element
    loraMetadata.appendChild(metadataContainer);
  }
  
  function Addtags(tag, count, color) {
    const container = document.getElementById("datasetTags");
  
    const bgcolor = "bg-" + color + "-200";
    const fgcolor = "bg-" + color + "-400";
  
    // Create the outer div for the tag
    const tagDiv = document.createElement("div");
    tagDiv.classList.add("flex-shrink-0", "text-black", bgcolor, "rounded-lg", "p-1");
  
    // Create the text for the tag
    const tagText = document.createTextNode(tag + " ");
    tagDiv.style.cursor = "pointer";
    tagDiv.appendChild(tagText);
  
    // Create the span for the count
    const countSpan = document.createElement("span");
    countSpan.classList.add("text-white", "rounded", fgcolor,); // Add "text-xs" class for smaller font size
    countSpan.textContent = count;
    tagDiv.appendChild(countSpan);
  
    // Append the tag to the container
    container.appendChild(tagDiv);
  
    if(IsInPrompt(tag,ignoreLoras=true)){
      tagDiv.classList.add("border-4","border-"+color+"-400",);
    }else{
      tagDiv.classList.remove("border-4","border-"+color+"-400",);
    }
    tagDiv.style.cursor == "pointer";// Change cursor to indicate it's clickable
    // Add event listener to the tagDiv
    tagDiv.addEventListener("click", function () {
      console.log(tag); // Replace this with your desired action when the tag is clicked.
  
      if(IsInPrompt(tag,ignoreLoras=true)){
        tagDiv.classList.remove("border-4","border-"+color+"-400",);
        RemoveFromPrompt(tag);
      }else{
        tagDiv.classList.add("border-4","border-"+color+"-400",);
        AddToPrompt(tag);
      }
    });
  }

  function GetActivationTags(string) {
    let tags = [];
    if(string.includes("|")){
      tags = string.split("|");
    }else{
      tags = string.split(",");
    }
    return tags;
  }
  
  function build_tags(metadata) {
    // Helper function to check if a tagset meets the required conditions
    function is_non_comma_tagset(tags) {
      const average_tag_length = Object.keys(tags).reduce((sum, tag) => sum + tag.length, 0) / Object.keys(tags).length;
      return average_tag_length >= 16;
    }
  
    const tags = {};
  
    for (const [_, tags_dict] of Object.entries(metadata["ss_tag_frequency"] || {})) {
      for (const [tag, tag_count] of Object.entries(tags_dict)) {
        const cleanedTag = tag.trim();
        tags[cleanedTag] = (tags[cleanedTag] || 0) + parseInt(tag_count);
      }
    }
  
    if (Object.keys(tags).length > 0 && is_non_comma_tagset(tags)) {
      const new_tags = {};
  
      const re_word = /\b\w{3,}\b/; //I don't even know what this does but it works
      for (const text in tags) {
        const text_count = tags[text];
        const words = text.match(re_word);
        if (words) {
          words.forEach(word => {
            if (word.length >= 3) {
              new_tags[word] = (new_tags[word] || 0) + text_count;
            }
          });
        }
      }
  
      Object.assign(tags, new_tags);
    }
  
    const ordered_tags = Object.keys(tags).sort((a, b) => tags[b] - tags[a]);
  
    // Function to generate class names based on the provided color
  
  
    const container = document.getElementById("datasetTags");
    for (const tag of ordered_tags) {
      const count = tags[tag];
      const colors = ["red", "blue", "green", "yellow", "purple","orange","pink","cyan","emerald"]
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      Addtags(tag, count, randomColor);
    }
  }
  
  
  
  // Event handler for Lora entry click
  function handleLoraEntryClick(name, category = "") {
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
        tags = GetActivationTags(text);
  
        if (weight == 0 || weight == null) {
          weight = 1;
        }
        if (text == null) {
          text = "";
        }
  
        if (lora.isHypernet) {
          AddToPrompt(`<hypernet:${name}:1>`);
          AddToPrompt(tags[0],true,true);
        } else {
          AddToPrompt(`<lora:${name}:${weight}>`,true);
          AddToPrompt(tags[0],true,true);
        }
  
  
        UpdateLoraDisplays();
  
      }).catch(error => {
        lora = getLoraByName(name);
        console.log("Lora config error:"+error);
        
        let weight = 1;
        
  
        if (lora.isHypernet) {
          AddToPrompt(`<hypernet:${name}:1>`);
        }
        else {
          AddToPrompt(`<lora:${name}:${weight}>`);
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
    RemoveFromPrompt(regex);
  
    const config = getLoraConfigByName(name);
    if (config != null) {
      const activationText = config["activation text"]
      if (activationText != null) {
        let tags = GetActivationTags(activationText);
        tags.forEach(tag => {
          RemoveFromPrompt(tag)
        });
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
  
  
  /**
   * Handles the Loras functionality.
   */

  
  
  
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
      _searchTerm = _searchTerm.replaceAll(" ", "")
      loraName = loraName.replaceAll(" ", "");
      loraName = loraName.replaceAll("_", "");
      loraName = loraName.replaceAll("-", "");
      
  
      if (loraName.includes(_searchTerm) || element.id.toLowerCase().includes(searchTerm.toLowerCase()) || getLoraByName(element.id).category.toLowerCase().includes(searchTerm.toLowerCase())) {
        element.classList.remove("hidden");
      } else {
        element.classList.add("hidden");
      }
    }
  
  }
  
