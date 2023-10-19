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

const civitai_nsfw = document.getElementById("civitai_nsfw");
const civitai_favorites = document.getElementById("civitai_favorites");
const civitai_nsfw_level = document.getElementById("civitai_nsfw_level");
const civitai_sort = document.getElementById("civitai_sort");
const civitai_period = document.getElementById("civitai_period");

function updateCivitAi() {

    if (serverType == ServerType.Horde || (serverType == ServerType.Automatic1111 && document.getElementById("allowCivitai").checked)) {

        automatic1111_support = (serverType == ServerType.Automatic1111 && document.getElementById("allowCivitai").checked);

        if (serverType == ServerType.Horde) {
            showCivitAi = true;
        }
        civitaiBtn.classList.remove("hidden");

        if (showCivitAi) {
            ToggleElements(".civitai", true)
            ToggleElements(".network", false)
            civitaiSearch(document.getElementById("searchInput").value);
            civitaiBtn.classList = "inline-block p-4 text-blue-600 border-b-2 border-blue-600 rounded-t-lg active dark:text-blue-500 dark:border-blue-500"
            networkBtn.classList = "inline-block p-4 border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300"
        } else {
            ToggleElements(".civitai", false)
            ToggleElements(".network", true)
            networkBtn.classList = "inline-block p-4 text-blue-600 border-b-2 border-blue-600 rounded-t-lg active dark:text-blue-500 dark:border-blue-500"
            civitaiBtn.classList = "inline-block p-4 border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300"
        }
        if (serverType == ServerType.Horde) {
            networkBtn.classList.add("hidden");
        }

    } else {
        //hide civitai
        ToggleElements(".civitai", false)
        ToggleElements(".network", true)
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

    if (!showCivitAi) {
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



    let nsfw = civitai_nsfw.checked

    let _url = `https://civitai.com/api/v1/models?primaryFileOnly=true&types=LORA&sort=${civitai_sort.value}&period=${civitai_period.value}&nsfw=${nsfw}&tag=${current_tag}&query=${searchTerm.replaceAll(" ", "%20")}`;

    if (civitai_favorites.checked) {
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
            current_nsfw_level = parseInt(civitai_nsfw_level.value);
            if (!nsfw) {
                current_nsfw_level = 0;
            }

            if (automatic1111_support) {
                console.log("Checking installed models");
                payload = {
                    "ids": [],
                }
                data.items.forEach(model => {
                    payload.ids.push(model.id);
                });
                console.log("install", JSON.stringify(payload));
                fetch(url + "/civitai/installed-multiple", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                }).then(response => response.json()).then(_data => {

                    console.log("install", _data);

                    Object.keys(_data).forEach(key => {
                        installed_models[parseInt(key)] = _data[key];
                    });

                    console.log("install", installed_models);
                    showCivitLoras(data, current_nsfw_level);
                    return;
                }).catch(error => {
                    console.log("install", error);
                });
            } else {
                showCivitLoras(data, current_nsfw_level);
            }
        })
}


function favorite_lora(id, icon) {

    if (favorite_loras == null) {
        favorite_loras = [];
    }

    if (favorite_loras.find(lora => lora === id)) {
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

function isFavorited(id) {
    if (favorite_loras == null) {
        return false;
    }
    return favorite_loras.find(lora => lora === id)
}

let blur_level = {
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

            while (!foundImage) {
                if (_images[level].length > 0) {

                    if (document.getElementById("civitRandomImage").checked) {
                        image = _images[level][Math.floor(Math.random() * _images[level].length)];
                    } else {
                        image = _images[level][0];
                    }

                    foundImage = true;
                } else if (level == 0) {
                    while (!foundImage) {
                        if (_images[level].length > 0) {
                            if (document.getElementById("civitRandomImage").checked) {
                                image = _images[level][Math.floor(Math.random() * _images[level].length)];
                            } else {
                                image = _images[level][0];
                            }
                            isBlurred = blur_level[level - nsfwLevel];

                            foundImage = true;
                        } else if (level == 3) {
                            foundImage = true
                            image = ""
                        }
                        else {
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

        civitai_addLoraEntry(image, lora, isBlurred);
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

            if (current_tag == tag.name) {
                tagSpan.classList.add("horde", "bg-blue-100", "text-blue-800", "text-sm", "font-medium", "mr-2", "px-2.5", "py-0.5", "rounded", "dark:bg-blue-900", "dark:text-blue-300");
            } else {
                tagSpan.classList.add("horde", "bg-gray-100", "text-gray-800", "text-sm", "font-medium", "mr-2", "px-2.5", "py-0.5", "rounded", "dark:bg-gray-700", "dark:text-gray-300");
            }
            tagSpan.style.cursor = "pointer";
            tagSpan.addEventListener("click", () => {
                if (current_tag == tag.name) {
                    current_tag = "";
                    all_tag_elemnts.forEach(tag => {
                        tag.classList.remove("horde", "bg-blue-100", "text-blue-800", "dark:bg-blue-900", "dark:text-blue-300");
                        tag.classList.add("horde", "bg-gray-100", "text-gray-800", "dark:bg-gray-700", "dark:text-gray-300");
                    });
                    //change style
                    tagSpan.classList.remove("bg-blue-100", "text-blue-800", "dark:bg-blue-900", "dark:text-blue-300");
                    tagSpan.classList.add("bg-gray-100", "text-gray-800", "dark:bg-gray-700", "dark:text-gray-300");

                } else {
                    current_tag = tag.name;
                    all_tag_elemnts.forEach(tag => {
                        tag.classList.remove("horde", "bg-blue-100", "text-blue-800", "dark:bg-blue-900", "dark:text-blue-300");
                        tag.classList.add("horde", "bg-gray-100", "text-gray-800", "dark:bg-gray-700", "dark:text-gray-300");
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
                if (automatic1111_support) {
                    console.log("Checking installed models");
                    payload = {
                        "ids": [],
                    }
                    data.items.forEach(model => {
                        payload.ids.push(model.id);
                    });
                    console.log("install", JSON.stringify(payload));
                    fetch(url + "/civitai/installed-multiple", {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    }).then(response => response.json()).then(_data => {

                        console.log("install", _data);

                        Object.keys(_data).forEach(key => {
                            installed_models[parseInt(key)] = _data[key];
                        });

                        console.log("install", installed_models);
                        showCivitLoras(data, current_nsfw_level);
                        loadingContent = false
                        return;
                    }).catch(error => {
                        console.log("install", error);
                    });
                } else {
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
function civitai_addLoraEntry(imageSrc, data, Blurred = null) {
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
    image.classList.add('object-cover', 'object-center', 'w-full', 'aspect-[2/3]', "transition-all", "duration-300");

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
    nameLink.classList.add("mb-2", "text-xl", "font-bold", "tracking-tight", "text-gray-900", "dark:text-white", "whitespace-normal", "break-words", "max-h-4", "overflow-hidden");

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

    if (automatic1111_support) {
        if (installed_models[data.id]) {
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


        if (serverType == ServerType.Horde) {
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

        } else if (automatic1111_support) {



            if (installed_models[data.id]) {
                handleLoraEntryClick(installed_models[data.id].filename);
            } else {
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
        OpenCivitAiModal(data.id);
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


//#region CivitAi Modal
const model_name = document.getElementById('civitai_modelName');
const tag_container = document.getElementById('civitai_tagContainer');

const download_count = document.getElementById('civitai_downloadCount');
const upload_date = document.getElementById('civitai_uploadDate');
const trigger_words = document.getElementById('civitai_triggerWords');

const rating = document.getElementById('civitai_rating');
const review_count = document.getElementById('civitai_reviewCount');

const creator_avatar = document.getElementById('civitai_creatorAvatar');
const creator_name = document.getElementById('civitai_creatorName');

const civitai_description = document.getElementById('civitai_description');

const civitai_images = document.getElementById('civitai_images');
const civitai_gallery_nsfwLevel = document.getElementById('civitai_gallery_nsfwLevel');

const loadMoreBtn = document.getElementById('civitai_loadMoreButton');

const civitai_loading = document.getElementById('civitai_loading');

function OpenCivitAiModal(id) {
    document.getElementById("civitModalLink").href = "https://civitai.com/models/" + id;

    document.getElementById("civitAIModalToggle").click();

    civitai_loading.classList.remove("hidden");
    fetch("https://civitai.com/api/v1/models/" + id + "").then(response => response.json()).then(data => {

        var versionData = data.modelVersions[0];

        model_name.textContent = data.name;
        tag_container.innerHTML = "";
        data.tags.forEach(tag => {
            const tagSpan = document.createElement("span");
            tagSpan.textContent = tag;
            tagSpan.classList.add("select-none", "horde", "bg-gray-100", "text-gray-800", "text-sm", "font-medium", "mr-2", "px-2.5", "py-0.5", "rounded", "dark:bg-gray-600", "dark:text-gray-300");
            tag_container.appendChild(tagSpan);
        });
        download_count.textContent = data.stats.downloadCount;
        //2023-06-30T15:10:31.680Z
        upload_date.textContent = new Date(versionData.createdAt).toLocaleDateString();

        trigger_words.innerHTML = "";
        versionData.trainedWords.forEach(word => {
            //add codeBlock
            const codeBlock = document.createElement("code");
            codeBlock.classList.add("px-2", "py-1", "font-mono", "text-sm", "text-gray-900", "dark:text-gray-300", "bg-gray-100", "dark:bg-gray-700", "rounded");
            codeBlock.textContent = word;
            trigger_words.appendChild(codeBlock);
        });
        AddCodeBlockButtons(trigger_words);

        rating.textContent = versionData.stats.rating;
        review_count.textContent = versionData.stats.ratingCount + " reviews";
        review_count.href = "https://civitai.com/models/" + id + "/reviews";
        review_count.target = "_blank";

        creator_avatar.src = data.creator.image;
        creator_name.textContent = data.creator.username;
        creator_name.href = "https://civitai.com/user/" + data.creator.username;

        civitai_description.innerHTML = data.description;
        AddCodeBlockButtons(civitai_description);

        civitai_images.innerHTML = "";
        const images = versionData.images;

        for (let i = 0; i < images.length; i += 2) {



            // Create a new item div
            const carouselItem = document.createElement('div');
            carouselItem.className = 'hidden duration-700 ease-in-out flex justify-center overflow-hidden';
            carouselItem.setAttribute('data-carousel-item', '');

            for (let j = i; j < Math.min(i + 2, images.length); j++) {


                var _nsfwLevel = nsfw_level[images[j]["nsfw"]];

                // Skip images that are above the current NSFW level
                if (!civitai_nsfw.checked && _nsfwLevel != 0) {
                    continue;
                }
                let blur = null;
                if (_nsfwLevel > parseInt(civitai_nsfw_level.value)) {
                    blur = blur_level[_nsfwLevel - parseInt(civitai_nsfw_level.value)];
                }
                const imageDiv = document.createElement('div');
                imageDiv.classList.add(
                    'overflow-hidden', 'relative', 'rounded-lg', 'mx-1', 'my-1', 'transition-all', 'duration-300'
                );


                const _image = document.createElement('img');
                _image.src = images[j].url;
                _image.className = 'object-cover h-full rounded mx-1 max-w-1/2 transition-all duration-300 min-w-[5rem]';
                _image.classList.add(blur);
                _image.addEventListener('mouseover', function () {
                    if (document.getElementById("unBlurOnHover").checked) {
                        _image.classList.remove(blur);
                    }
                });
                _image.addEventListener('mouseout', function () {
                    _image.classList.add(blur);
                });
                imageDiv.appendChild(_image);
                _image.onload = function () {
                    imageDiv.style.width = _image.width + "px";
                };


                if (images[j].meta) {
                    const infoIcon = document.createElement("i");
                    infoIcon.classList.add("fa-solid", "fa-circle-info", "text-white", "absolute", "bottom-2", "right-2", "z-40", "shadow");
                    infoIcon.title = "View Metadata";
                    infoIcon.style.cursor = "pointer";
                    infoIcon.setAttribute('data-dropdown-toggle', 'metaDropdown');
                    infoIcon.addEventListener('click', (e) => {
                        UpdateMetaData(images[j].meta);
                    });

                    imageDiv.appendChild(infoIcon);
                }



                // Append the image to the item
                carouselItem.appendChild(imageDiv);
            }

            // Append the item to the carousel container
            civitai_images.appendChild(carouselItem);
        }
        initDropdowns();

        initCarousels();

        civitai_loading.classList.add("hidden");
    });

    civitai_gallery_nsfwLevel.value = civitai_nsfw_level.value;
    if (!civitai_nsfw.checked) {
        civitai_gallery_nsfwLevel.value = 0;
    }
    civitai_gallery_nsfwLevel.dataset.id = id;
    civitai_gallery_nsfwLevel.addEventListener('change', (e) => {
        loadCivitaiImages(e.target.dataset.id, e.target.value, true);
    });

    loadCivitaiImages(id, civitai_gallery_nsfwLevel.value, true);
}
const civitai_gallery_loading = document.getElementById('civitai_gallery_loading');

function loadCivitaiImages(modelId = null, nsfwLevel = null, clear = true, overrideURL = null) {

    let nsfwLevels = [
        "None",
        "Soft",
        "Mature",
        "X",
    ]

    var _url;
    if (modelId != null) {
        _url = "https://civitai.com/api/v1/images?modelId=" + modelId
        if (nsfwLevel != null) {
            _url += "&nsfw=" + nsfwLevels[nsfwLevel];
        }
    }
    if (overrideURL != null) {
        _url = overrideURL;
    }
    if (_url == null) {
        console.log("No URL");
        return;
    }
    civitai_gallery_loading.classList.remove("hidden");
    fetch(_url).then(response => response.json()).then(data => {

        const columns = [
            document.getElementById("civitai_gallery1"),
            document.getElementById("civitai_gallery2"),
            document.getElementById("civitai_gallery3"),
            document.getElementById("civitai_gallery4"),
        ]
        if (clear) {
            columns.forEach(column => {
                column.innerHTML = "";
            });
        }

        for (let i = 0; i < data.items.length; i++) {
            const imageDiv = document.createElement("div");
            imageDiv.classList.add("overflow-hidden", "relative", "my-1.5");
            imageDiv.style.display = "inline-block"; // Set display to inline-block

            const _image = document.createElement("img");
            _image.classList.add("h-auto", "max-w-full", "rounded-lg");
            _image.src = data.items[i].url;
            imageDiv.appendChild(_image);

            _image.onerror = function () {
                imageDiv.remove();
            };

            if (data.items[i].meta) {
                const infoIcon = document.createElement("i");
                infoIcon.classList.add("fa-solid", "fa-circle-info", "text-white", "absolute", "bottom-4", "right-4");
                infoIcon.title = data.items[i].meta;
                infoIcon.style.cursor = "pointer";
                infoIcon.setAttribute('data-dropdown-toggle', 'metaDropdown');
                infoIcon.addEventListener('click', (e) => {
                    UpdateMetaData(data.items[i].meta);
                });

                imageDiv.appendChild(infoIcon);
            }

            columns[i % 4].appendChild(imageDiv);
        }
        initDropdowns();

        loadMoreBtn.dataset.next = data.metadata.nextPage;
        loadMoreBtn.addEventListener('click', (e) => {
            loadCivitaiImages(null, null, false, e.target.dataset.next);
        });
        if (data.metadata.nextPage == null) {
            loadMoreBtn.classList.add("hidden");
        } else {
            loadMoreBtn.classList.remove("hidden");
        }
        civitai_gallery_loading.classList.add("hidden");
    });
}
const metaElements = {
    prompt: 'meta_prompt',
    negativePrompt: 'meta_negativePrompt',
    sampler: 'meta_sampler',
    Model: 'meta_model',
    cfgScale: 'meta_cfg',
    steps: 'meta_steps',
    seed: 'meta_seed',
    'Clip skip': 'meta_clip',
};

function UpdateMetaData(meta) {
    for (const prop in metaElements) {
        const element = document.getElementById(metaElements[prop]);
        if (meta[prop]) {
            element.parentElement.classList.remove("hidden");
            element.textContent = meta[prop];
        } else {
            element.parentElement.classList.add("hidden");
        } element.textContent
    }
    document.getElementById("meta_use").onclick = function () {
        UseMetaData(meta);
        document.getElementById("civitAIModalToggle").click();
    };
}

const elementsForMeta = {
    prompt: ['prompt', 'value'],
    negativePrompt: ['negativePrompt', 'value'],
    sampler: ['sampler', 'value'],
    cfgScale: ['scale-slider', 'value'],
    steps: ['steps-slider', 'value'],
    seed: ['seed-input', 'value'],
}
const automatic2hordeSampler = {
    'Euler A': "k_euler_a",
    'DPM++ 2M Karras': "k_dpm_2",
    'DPM++ SDE Karras': "k_dpmpp_sde",
    'DPM++ 2M SDE Exponential': "k_dpmpp_sde",
    'DPM++ 2M SDE Karras': "k_dpmpp_sde",
    'Euler': "k_euler",
    'LMS': "k_lms",
    'Heun': "k_heun",
    'DPM2': "k_dpm_2",
    'DPM2 a': "k_dpm_2_a",
    'DPM++ 2S a': "k_dpmpp_2s_a",
    'DPM++ 2M': "k_dpmpp_2m",
    'DPM++ SDE': "k_dpmpp_sde",
    'DPM++ 2M SDE': "k_dpmpp_sde",
    'DPM++ 2M SDE Heun': "k_heun",
    'DPM++ 2M SDE Heun Karras': "k_dpmpp_2m",
    'DPM++ 2M SDE Heun Exponential': "k_dpmpp_sde",
    'DPM++ 3M SDE': "k_dpmpp_sde",
    'DPM++ 3M SDE Karras': "k_dpmpp_sde",
    'DPM fast': "k_dpm_fast",
    'DPM adaptive': "k_dpm_adaptive",
    'LMS Karras': "k_lms",
    'DPM2 Karras': "k_dpm_2",
    'DPM2 a Karras': "k_dpm_2_a",
    'DPM++ 2S a Karras': "k_dpmpp_2s_a",
    'Restart': "k_dpm_fast",
    'DDIM': "DDIM",
    'PLMS': "k_lms",
    'UniPC': "k_dpm_2"
};


function UseMetaData(meta) {
    console.log("Use Meta:", meta);
    for (const prop in elementsForMeta) {
        const [elementId, property] = elementsForMeta[prop];
        const element = document.getElementById(elementId);

        if (element) {
            if (meta[prop]) {

                if (prop == "sampler" && serverType == ServerType.Horde) {
                    element.value = automatic2hordeSampler[meta[prop]];
                } else {
                    element[property] = meta[prop];
                }

                if (property === 'value') {
                    element.dispatchEvent(new Event('input')); // Trigger input event for sliders/inputs
                }
                element.parentElement.classList.remove("hidden");
            } else {
                element.parentElement.classList.add("hidden");
            }
        }
    }
    if (serverType == ServerType.Horde) {
        if (meta.hashes && meta.hashes.keys) {
            meta.hashes.keys.forEach((key, index) => {
                //if key starts with lora:
                if (key.startsWith("lora:")) {
                    //add lora to horde
                    const hash = key.split(":")[1];
                    fetch("https://civitai.com/api/v1/model-versions/by-hash/" + hash).then(response => response.json()).then(data => {
                        console.log("Found Lora:", data);
                        horde_AddLora(data.model.name, data.modelId, data.trainedWords);
                        
                    });
                }
            });
        }
    }
}


//#endregion



//#region Find Loras
document.getElementById("find_loras").addEventListener('click', findLorasInPrompt);

const foundLoraContainer = document.getElementById("foundLoraContainer");

//lora is like <lora:model name:1>
async function findLorasInPrompt() {
    var prompt = document.getElementById("prompt").value;
    var loraRegex = /<lora:([\w\s_.\-]+):([\d.]+)>/g; // Modify the regex to capture the name and the number with decimal values and periods
    var loras = prompt.matchAll(loraRegex); // Use matchAll() to find all matches in the text

    console.log("Prompt:", prompt);
    foundLoraContainer.innerHTML = "";

    // Check if any matches were found
    for (const lora of loras) {
        var name = lora[1];
        var number = lora[2];
        console.log("Found Lora: Name =", name, ", Number =", number);

        console.log("Found Lora:", lora[1]); // Print the captured name (group 1)
        // Print the captured name (group 1)
        const loraDiv = document.createElement("div");
        const label = document.createElement("label");
        label.classList.add("block", "mb-2", "text-lg", "font-medium", "text-gray-900", "dark:text-white");
        label.textContent = lora[1];
        loraDiv.appendChild(label);

        var modelname = lora[1].replaceAll(" ", "%20").replaceAll(":", "%3A").replaceAll("/", "%2F").replaceAll("\\", "%5C").replaceAll(".", "%2E");

        const ModelContainer = document.createElement("div");
        ModelContainer.classList.add("h-64", "overflow-x-auto", "flex", "overflow-y-clip", "space-x-2", "pb-6");
        loraDiv.appendChild(ModelContainer);

        fetch('https://api.searchcivitai.com/api/models?q=' + modelname + '&sort_by=default&type=LORA').then(response => response.json()).then(data => {

            console.log("Found Lora:", data);

            let model_images = []

            data.models.forEach(model => {
                const modelDiv = document.createElement("div");
                modelDiv.classList.add("h-full", "aspect-[2/3]", "relative")
                const modelImage = document.createElement("img");
                modelImage.src = model.images[0].url;
                modelImage.classList.add(
                    "h-full",
                    "aspect-[2/3]",
                    "object-cover",
                    "rounded-lg",
                    "border",
                    "border-gray-300",
                    "bg-gray-100",
                    "cursor-pointer");


                const modelLabel = document.createElement("label");
                modelLabel.classList.add("block", "text-sm", "font-medium", "text-gray-900", "dark:text-white", "absolute", "bottom-0", "left-0", "right-0", "bg-black", "bg-opacity-50", "rounded-b-lg", "text-center");
                modelLabel.textContent = model.model.name;
                modelDiv.appendChild(modelLabel);
                modelLabel.addEventListener('click', (e) => {
                    OpenCivitAiModal(model.id);
                });



                modelLabel.style.cursor = "pointer";


                modelDiv.appendChild(modelImage);
                model_images.push(modelImage);

                ModelContainer.appendChild(modelDiv);
            });

            model_images.forEach((image, index) => {
                image.addEventListener("click", (e) => {
                    model_images.forEach(image => {
                        image.classList.remove("border-4", "border-green-400");
                        image.classList.add("border", "border-gray-300");
                        horde_loras = horde_loras.filter(lora => lora.name != data.models[index].id.toString());
                    });
                    UpdateCurrentLoras();
                    image.classList.remove("border", "border-gray-300");
                    image.classList.add("border-4", "border-green-400");
                    horde_AddLora(data.models[index].model.name, data.models[index].id, data.models[index].model.modelVersions[0].trainedWords);

                });
            });

        });

        foundLoraContainer.appendChild(loraDiv);
        //delay
        await new Promise(r => setTimeout(r, 1000));

    }


}

//#endregion


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
        if (first_image) {
            imageElement.classList.remove("border", "border-gray-300");
            imageElement.classList.add("border-4", "border-green-400");
            first_image = false;
            selected_thumbnail = j;
            console.log("Selected", selected_thumbnail);
        }
        imageElement.addEventListener("click", (e) => {

            selected_thumbnail = parseInt(e.target.dataset.id);
            console.log("Selected", selected_thumbnail);

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

function getFolders(showMessage = true) {

    if (automatic1111_model_dirs != null) {
        return;
    }

    fetch(url + "/civitai/subfolders").then(response => response.json()).then(data => {
        automatic1111_model_dirs = data;
        console.log("Folders", data);
    }).catch(error => {
        console.log(error);
        e.target.checked = false;
        if (showMessage) {
            showMessage("Extension Not Installed/Could not connect to server", 3000, "Error")
        }
    });
}

document.getElementById("civitai_downloadBtn").addEventListener('click', () => {

    //disable button
    document.getElementById("civitai_downloadBtn").disabled = true;

    let id = parseInt(download_name.dataset.id);
    let version = parseInt(download_version.value);
    let folder = download_folder.value.replaceAll("/", "%2F").replaceAll("\\", "%5C").replaceAll(" ", "%20");

    console.log("Downloading", id, version, folder);

    document.getElementById("civitai_downloadBtn").textContent = "Downloading...";
    fetch(url + "/civitai/download/?id=" + id + "&subfolder=" + folder + "&version=" + version + "&image=" + selected_thumbnail, {
        method: 'POST',
    }).then(response => response.json()).then(data => {
        console.log("Download", data);

        if (data["message"] == "downloaded") {
            //enable button
            document.getElementById("civitai_downloadBtn").disabled = false;
            document.getElementById("civitai_downloadBtn").textContent = "Download";
            //refresh loras
            fetch(url + "/sdapi/v1/refresh-loras", {
                method: 'POST',
            }).then(response => response.json()).then(_data => {
                lorasHandled = false;
                HandleLoras();
                AddToPrompt("<lora:" + data["filename"] + ":1>", true)
                civitaiSearch(document.getElementById("searchInput").value);
                document.getElementById("loraDownloadModalClose").click();
            });
        }


    })
});

document.getElementById("allowCivitai").addEventListener('change', (e) => {
    if (e.target.checked) {
        getFolders();
    }
    updateCivitAi();
});

document.getElementById("filterButton").addEventListener('click', () => {
    civitaiSearch(document.getElementById("searchInput").value);
})
if (automatic1111_model_dirs == null) {
    getFolders(false);
}

getTags();