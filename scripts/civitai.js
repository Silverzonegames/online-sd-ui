current_nsfw_level = 0;
let current_tag = "";
let tags = [];
let favorite_loras = [];

let nextPage = null;

let automatic1111_model_dirs = null;

let showCivitAi = false;

const networkBtn = document.getElementById("networkBtn");
const civitaiBtn = document.getElementById("civitaiBtn");

const networkContainer = document.getElementById("lorasContainer");
const civitaiContainer = document.getElementById("civitaiContainer");

let automatic1111_support = false;
let installed_models = {};


function updateCivitAi() {

    if(serverType == ServerType.Horde || (serverType == ServerType.Automatic1111 && document.getElementById("allowCivitai").checked)){

        automatic1111_support = (serverType == ServerType.Automatic1111 && document.getElementById("allowCivitai").checked);

        if(serverType == ServerType.Horde){
            showCivitAi = true;
        }
        civitaiBtn.classList.remove("hidden");
        
        if(showCivitAi){
            ToggleElements(".civitai",true)
            ToggleElements(".network",false)
            civitaiSearch(document.getElementById("searchInput").value);
            civitaiBtn.classList = "inline-block p-4 text-blue-600 border-b-2 border-blue-600 rounded-t-lg active dark:text-blue-500 dark:border-blue-500"
            networkBtn.classList = "inline-block p-4 border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300"
        }else{
            ToggleElements(".civitai",false)
            ToggleElements(".network",true)
            networkBtn.classList = "inline-block p-4 text-blue-600 border-b-2 border-blue-600 rounded-t-lg active dark:text-blue-500 dark:border-blue-500"
            civitaiBtn.classList = "inline-block p-4 border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300"
        }
        if(serverType == ServerType.Horde){
            networkBtn.classList.add("hidden");
        }
        
    }else{
        //hide civitai
        ToggleElements(".civitai",false)
        ToggleElements(".network",true)
        networkBtn.classList = "inline-block p-4 text-blue-600 border-b-2 border-blue-600 rounded-t-lg active dark:text-blue-500 dark:border-blue-500"
        civitaiBtn.classList.add("hidden");
    }
}

networkBtn.addEventListener('click', () => {

    showCivitAi = false;
    updateCivitAi();
});
civitaiBtn.addEventListener('click', () => {

    showCivitAi = true;
    updateCivitAi();
});


function civitaiSearch(searchTerm) {

    if(!showCivitAi){
        return;
    }


    nextPage = null;
    console.log("Searching for: " + searchTerm);

    const lorasContainer = document.getElementById('civitaiContainer')
    lorasContainer.innerHTML = "";


    searchingElement = document.createElement('div')
    searchingElement.classList.add('block', 'px-4', 'py-2', 'text-gray-600', 'font-bold');
    searchingElement.textContent = "Fetching..."
    lorasContainer.appendChild(searchingElement)

    const civitai_nsfw = document.getElementById("civitai_nsfw");
    const civitai_favorites = document.getElementById("civitai_favorites");
    const civitai_nsfw_level = document.getElementById("civitai_nsfw_level");
    const civitai_sort = document.getElementById("civitai_sort");
    const civitai_period = document.getElementById("civitai_period");

    let nsfw = civitai_nsfw.checked

    let _url = `https://civitai.com/api/v1/models?primaryFileOnly=true&types=LORA&sort=${civitai_sort.value}&period=${civitai_period.value}&nsfw=${nsfw}&tag=${current_tag}&query=${searchTerm.replaceAll(" ", "%20")}`;

    if(civitai_favorites.checked){
        _url = `https://civitai.com/api/v1/models?ids=0&primaryFileOnly=true&types=LORA&sort=${civitai_sort.value}&period=${civitai_period.value}&nsfw=${nsfw}&tag=${current_tag}`
        favorite_loras.forEach(id => {
            _url += `&ids=${id}`
        });

        _url += `&query=${searchTerm.replaceAll(" ", "%20")}`
    }

    console.log(_url);
    fetch(_url)
        .then(response => {
            return response.json();
        }).then(data => {
            lorasContainer.innerHTML = "";
            current_nsfw_level= parseInt(civitai_nsfw_level.value);
            if(!nsfw){
                current_nsfw_level = 0;
            }

            if(automatic1111_support) {
                console.log("Checking installed models");
                payload = {
                    "ids": [],
                }
                data.items.forEach(model => {
                    payload.ids.push(model.id);
                });
                console.log("install",JSON.stringify(payload));
                fetch(url+"/civitai/installed-multiple", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                }).then(response => response.json()).then(_data => {
                    
                    console.log("install",_data);

                    Object.keys(_data).forEach(key => {
                        installed_models[parseInt(key)] = _data[key];
                    });

                    console.log("install",installed_models);
                    showCivitLoras(data,current_nsfw_level);
                    return;
                }).catch(error => {
                    console.log("install",error);
                });
            }else{
                showCivitLoras(data,current_nsfw_level);
            }
        })
}


function favorite_lora(id, icon) {

    if(favorite_loras == null){
        favorite_loras = [];
    }

    if(favorite_loras.find(lora => lora === id)) {
        console.log("Removing from favorites");
        icon.classList.remove("text-rose-600");
        icon.classList.add("text-white");
        favorite_loras = favorite_loras.filter(lora => lora !== id);
    } else {
        console.log("Adding to favorites");
        icon.classList.remove("text-white");
        icon.classList.add("text-rose-600");
        favorite_loras.push(id);
    }
    SaveState();
}

function isFavorited(id){
    if(favorite_loras == null){
        return false;
    }
    return favorite_loras.find(lora => lora === id)
}

let blur_level={
    0: null,
    1: "blur",
    2: "blur-md",
    3: "blur-lg",
}

function showCivitLoras(data, nsfwLevel) {
    console.log(data);
    data["items"].forEach(lora => {
        let image = lora.modelVersions[0].images[0];

        let _images = [
            [],
            [],
            [],
            [],
        ];
        let isBlurred = null;
        if (image) {
            image = lora.modelVersions[0].images[0].url;
            lora.modelVersions[0].images.forEach(image => {
                imageLevel = nsfw_level[image["nsfw"]];
                _images[imageLevel].push(image.url);
            });
            let foundImage = false;
            let level = nsfwLevel;

            while (!foundImage){
                if(_images[level].length > 0){

                    if(document.getElementById("civitRandomImage").checked){
                        image = _images[level][Math.floor(Math.random() * _images[level].length)];
                    }else{
                        image = _images[level][0];
                    }

                    foundImage = true;
                } else if (level == 0){
                    while(!foundImage){
                        if(_images[level].length > 0){
                            if(document.getElementById("civitRandomImage").checked){
                                image = _images[level][Math.floor(Math.random() * _images[level].length)];
                            }else{
                                image = _images[level][0];
                            }
                            isBlurred = blur_level[level-nsfwLevel];
                            
                            foundImage = true;
                        }else if(level == 3){
                            foundImage = true
                            image=""
                        }
                        else{
                            level++;
                        }

                    }
                }
                else {
                    level--;
                }
            }
        }
        tokens = lora.modelVersions[0].trainedWords;

        civitai_addLoraEntry(image, lora,isBlurred);
    });

    nextPage = data.metadata.nextPage;

    
}


let all_tag_elemnts = [];
function getTags() {
    fetch("https://civitai.com/api/v1/tags").then(response => response.json()).then(data => {
        tags = data.items;
        console.log(tags);
        tags.forEach(tag => {
            const tagSpan = document.createElement("span");
            tagSpan.textContent = tag.name;

            //make text not selectable
            tagSpan.classList.add("select-none");

            if(current_tag == tag.name){
                tagSpan.classList.add("horde","bg-blue-100", "text-blue-800", "text-sm", "font-medium", "mr-2", "px-2.5", "py-0.5", "rounded", "dark:bg-blue-900", "dark:text-blue-300");
            }else{
                tagSpan.classList.add("horde","bg-gray-100", "text-gray-800", "text-sm", "font-medium", "mr-2", "px-2.5", "py-0.5", "rounded", "dark:bg-gray-700", "dark:text-gray-300");
            }
            tagSpan.style.cursor = "pointer";
            tagSpan.addEventListener("click", () => {
                if(current_tag == tag.name){
                    current_tag = "";
                    all_tag_elemnts.forEach(tag => {
                        tag.classList.remove("horde","bg-blue-100", "text-blue-800", "dark:bg-blue-900", "dark:text-blue-300");
                        tag.classList.add("horde","bg-gray-100", "text-gray-800", "dark:bg-gray-700", "dark:text-gray-300");
                    });
                    //change style
                    tagSpan.classList.remove("bg-blue-100", "text-blue-800", "dark:bg-blue-900", "dark:text-blue-300");
                    tagSpan.classList.add("bg-gray-100", "text-gray-800", "dark:bg-gray-700", "dark:text-gray-300");

                }else{
                    current_tag = tag.name;
                    all_tag_elemnts.forEach(tag => {
                        tag.classList.remove("horde","bg-blue-100", "text-blue-800", "dark:bg-blue-900", "dark:text-blue-300");
                        tag.classList.add("horde","bg-gray-100", "text-gray-800", "dark:bg-gray-700", "dark:text-gray-300");
                    });
                    //change style
                    tagSpan.classList.remove("bg-gray-100", "text-gray-800", "dark:bg-gray-700", "dark:text-gray-300");
                    tagSpan.classList.add("bg-blue-100", "text-blue-800", "dark:bg-blue-900", "dark:text-blue-300");
                }
                civitaiSearch(document.getElementById("searchInput").value);
            });

            all_tag_elemnts.push(tagSpan);
            document.getElementById("tags").appendChild(tagSpan);
        });
    })
    

}

let loadingContent = false
lorasContainer.addEventListener('scroll', () => {
    const distanceToBottom = lorasContainer.scrollHeight - (lorasContainer.scrollTop + lorasContainer.clientHeight);

    if (distanceToBottom <= 2000) {
        if (nextPage != null && !loadingContent) {

            const fetchingText = document.createElement('p');
            fetchingText.classList.add('block', 'px-4', 'py-2', 'text-gray-600', 'font-bold');
            fetchingText.textContent = "Fetching..."
            lorasContainer.appendChild(fetchingText)
            console.log("Loading page ", nextPage);
            loadingContent = true
            fetch(nextPage).then(response => {
                return response.json();
            }).then(data => {
                fetchingText.remove()   
                if(automatic1111_support) {
                    console.log("Checking installed models");
                    payload = {
                        "ids": [],
                    }
                    data.items.forEach(model => {
                        payload.ids.push(model.id);
                    });
                    console.log("install",JSON.stringify(payload));
                    fetch(url+"/civitai/installed-multiple", {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    }).then(response => response.json()).then(_data => {
                        
                        console.log("install",_data);
    
                        Object.keys(_data).forEach(key => {
                            installed_models[parseInt(key)] = _data[key];
                        });
    
                        console.log("install",installed_models);
                        showCivitLoras(data,current_nsfw_level);
                        loadingContent = false
                        return;
                    }).catch(error => {
                        console.log("install",error);
                    });
                }else{
                    showCivitLoras(data, current_nsfw_level);
                    loadingContent = false

                }
            })
        }
    }
})


document.getElementById("searchInput").addEventListener('keyup', (e) => {



    if (e.key !== 'Enter') {
        return;
    }
    if (!showCivitAi) {
        return;
    }
    civitaiSearch(e.target.value);
});

const download_name = document.getElementById('download_name');
const download_folder = document.getElementById('download_folder');
const download_version = document.getElementById('download_version');
const loraDownloadModalToggle = document.getElementById('loraDownloadModalToggle');

//.name, lora.creator, lora.id, isBlurred,tokens
function civitai_addLoraEntry(imageSrc, data, Blurred=null) {
    // Create the necessary HTML elements
    const entryDiv = document.createElement('div');
    entryDiv.classList.add('group', 'relative', 'lora');
    entryDiv.id = data.id;

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('bg-white', 'border', 'border-gray-200', 'rounded-lg', 'shadow', 'dark:bg-gray-800', 'dark:border-gray-700');

    const imageDiv = document.createElement('div');
    imageDiv.classList.add(
        'overflow-hidden', 'rounded-t-lg'
    );

    const image = document.createElement('img');
    image.src = imageSrc;
    image.alt = 'Lora Thumbnail';
    image.classList.add('object-cover', 'object-center', 'w-full','aspect-[2/3]',"transition-all", "duration-300");

    if (Blurred) {
        image.classList.add(Blurred);
        imageDiv.addEventListener('mouseover', function () {
            if (document.getElementById("unBlurOnHover").checked) {
                image.classList.remove(Blurred);
            }
        });
        imageDiv.addEventListener('mouseout', function () {
            image.classList.add(Blurred);
        });
    }

    image.onerror = function () {
        image.src = "img/card-no-preview.png";
    };

    const infoDiv = document.createElement('div');
    infoDiv.classList.add('mt-4');
    infoDiv.style.cursor = "pointer";
    infoDiv.setAttribute('data-modal-target', 'loraInfoModal');
    infoDiv.setAttribute('data-modal-toggle', 'loraInfoModal');

    const nameHeading = document.createElement('h3');
    nameHeading.classList.add('text-sm', 'text-gray-700');

    const nameLink = document.createElement('a');
    nameLink.classList.add("mb-2", "text-xl", "font-bold", "tracking-tight", "text-gray-900", "dark:text-white", "whitespace-normal", "break-words","max-h-4", "overflow-hidden");

    const nameText = document.createTextNode(data.name);
    nameLink.appendChild(nameText);

    const userFlexDiv = document.createElement('div');
    userFlexDiv.classList.add('flex', 'm-2');

    const avatarImage = document.createElement('img');
    avatarImage.classList.add('w-6', 'h-6', 'rounded-full');
    avatarImage.src = data.creator.image;
    avatarImage.alt = "Rounded avatar";

    const userParagraph = document.createElement('p');
    userParagraph.classList.add('mb-3', 'my-auto', 'ml-2', 'font-normal', 'text-gray-700', 'dark:text-gray-400');
    userParagraph.textContent = data.creator.username;

    if(automatic1111_support){
        if(installed_models[data.id]){
            //add green checkmark
            const checkmark = document.createElement('i');
            checkmark.classList.add("fas", "fa-check", "text-green-500", "ml-2");
            checkmark.title = "Installed";
            userParagraph.appendChild(checkmark);
        }
    }




    // Add click event listener to the imageDiv
    imageDiv.addEventListener('click', function (event) {
        event.preventDefault();

        
        if(serverType == ServerType.Horde){
            if (horde_loras.length >= 5 || horde_loras.find(lora => lora.name === data.id.toString())) {
                return;
            }
            horde_loras.push({
                name: data.id.toString(),
                clip: 1,
                model: 1
            });
            loraCount.textContent = horde_loras.length + "/5";
            console.log(horde_loras);
            horde_AddLora(data.name, data.id, data.modelVersions[0].trainedWords);

        }else if(automatic1111_support){
            

            
            if(installed_models[data.id]){
                handleLoraEntryClick(installed_models[data.id].filename);
            }else{
                download_name.textContent = data.name;
                download_name.dataset.id = data.id;
                download_folder.innerHTML = "";
                //add options to download folder
                automatic1111_model_dirs[data.type].forEach(folder => {
                    const option = document.createElement("option");
                    option.textContent = folder;
                    download_folder.appendChild(option);
                });
                //add version options
                download_version.innerHTML = "";
                for (let i = 0; i < data.modelVersions.length; i++) {
                    const option = document.createElement("option");
                    option.textContent = data.modelVersions[i].name;
                    option.value = i;
                    download_version.appendChild(option);
                }
                download_version.addEventListener('change', (e) => {
                    showDownloadThumbnails(data.modelVersions[e.target.value].images);
                });

                //show thumbnails
                showDownloadThumbnails(data.modelVersions[0].images);

                loraDownloadModalToggle.click();
            }
            

        }
    });

    // Add click event listener to the nameLink
    infoDiv.addEventListener('click', function (event) {
        event.preventDefault();
        document.getElementById("civitIframe").src = "https://civitai.com/models/" + data.id;
        document.getElementById("civitModalLink").href = "https://civitai.com/models/" + data.id;
        document.getElementById("civitAIModalToggle").click();
    });

    // Append the elements to their respective parent elements
    contentDiv.appendChild(imageDiv);
    imageDiv.appendChild(image);

    contentDiv.appendChild(infoDiv);
    infoDiv.appendChild(nameHeading);
    nameHeading.appendChild(nameLink);

    infoDiv.appendChild(userFlexDiv);
    userFlexDiv.appendChild(avatarImage);
    userFlexDiv.appendChild(userParagraph);

    entryDiv.appendChild(contentDiv);

    // Append the entry to the container element
    const lorasContainer = document.getElementById('civitaiContainer');
    lorasContainer.appendChild(entryDiv);
}


// <!-- Selected thumbnail-->
// <img id="download_thumbnail" src="img/card-no-preview.png" alt="Thumbnail"
//   class="h-full aspect-[2/3] rounded-lg border-2 border-green-400  bg-gray-100">
// <!--Unselected Thumbnail-->
// <img id="download_thumbnail" src="img/card-no-preview.png" alt="Thumbnail"
//   class="h-full aspect-[2/3] rounded-lg border border-gray-300 bg-gray-100">

const download_thumbnail_container = document.getElementById("download_thumbnail_container");
let selected_thumbnail = 0;

function showDownloadThumbnails(images) {
    download_thumbnail_container.innerHTML = "";
    first_image = true;
    let j = 0;
    images.forEach(image => {
        const imageElement = document.createElement("img");
        imageElement.src = image.url;
        imageElement.alt = "Thumbnail";
        imageElement.dataset.id = j;
        // Apply CSS classes to the image element
        imageElement.classList.add(
            "h-full",
            "aspect-[2/3]", // Maintain 2/3 aspect ratio
            "object-cover", // Crop the image
            "rounded-lg",
            "border",
            "border-gray-300",
            "bg-gray-100",
            "cursor-pointer"
        );
        if(first_image){
            imageElement.classList.remove("border", "border-gray-300");
            imageElement.classList.add("border-4", "border-green-400");
            first_image = false;
            selected_thumbnail = j;
            console.log("Selected",selected_thumbnail);
        }
        imageElement.addEventListener("click", (e) => {

            selected_thumbnail = parseInt(e.target.dataset.id);
            console.log("Selected",selected_thumbnail);

            download_thumbnail_container.childNodes.forEach(image => {
                image.classList.remove("border-4", "border-green-400");
                image.classList.add("border", "border-gray-300");
            });
            e.target.classList.remove("border", "border-gray-300");
            e.target.classList.add("border-4", "border-green-400");
        });
        j++;
        download_thumbnail_container.appendChild(imageElement);
    });
}

function getFolders(showMessage=true){

    if(automatic1111_model_dirs != null){
        return;
    }

    fetch(url+"/civitai/subfolders").then(response => response.json()).then(data => {
        automatic1111_model_dirs = data;
        console.log("Folders",data);
    }).catch(error => {
        console.log(error);
        e.target.checked = false;
        if(showMessage) {
            showMessage("Extension Not Installed/Could not connect to server", 3000,"Error")
        }
    });
}

document.getElementById("civitai_downloadBtn").addEventListener('click', () => {  

    //disable button
    document.getElementById("civitai_downloadBtn").disabled = true;

    let id = parseInt(download_name.dataset.id);
    let version = parseInt(download_version.value);
    let folder = download_folder.value.replaceAll("/","%2F").replaceAll("\\","%5C").replaceAll(" ","%20");

    console.log("Downloading",id,version,folder);

    document.getElementById("civitai_downloadBtn").textContent = "Downloading...";
    fetch(url+"/civitai/download/?id="+id+"&subfolder="+folder+"&version="+version+"&image="+selected_thumbnail,{
        method: 'POST',
    }).then(response => response.json()).then(data => {
        console.log("Download",data);

        if(data["message"] == "downloaded"){
            //enable button
            document.getElementById("civitai_downloadBtn").disabled = false;
            document.getElementById("civitai_downloadBtn").textContent = "Download";            
            //refresh loras
            fetch(url+"/sdapi/v1/refresh-loras",{
                method: 'POST',
            }).then(response => response.json()).then(_data => {
                lorasHandled = false;
                HandleLoras();
                AddToPrompt("<lora:"+ data["filename"] +":1>", true)
                civitaiSearch(document.getElementById("searchInput").value);
                document.getElementById("loraDownloadModalClose").click();
            });
        }

        
    })  
});

document.getElementById("allowCivitai").addEventListener('change', (e) => {
    if(e.target.checked){
        getFolders();
    }
    updateCivitAi();
});

document.getElementById("filterButton").addEventListener('click', () => {
    civitaiSearch(document.getElementById("searchInput").value);
})
if(automatic1111_model_dirs == null){
    getFolders(false);
}

getTags();