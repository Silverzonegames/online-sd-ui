var images = []
var next_page = null;

var fetching = false;

function getImagesFromUrl(url, clear = false, update = false) {

    
    if (fetching) {
        return;
    }
    console.log("Fetching images from " + url);

    fetching = true;
    //add loading icon to image container
    if(clear){
        document.getElementById("imageContainer").innerHTML = "";
    }
    const loadingIcon = document.createElement("i");
    loadingIcon.classList.add("fa-solid", "fa-spinner", "fa-spin", "text-white", "text-4xl", "absolute", "top-1/2", "left-1/2", "transform", "-translate-x-1/2", "-translate-y-1/2", "z-50");
    document.getElementById("imageContainer").appendChild(loadingIcon);


    fetch(url).then(response => response.json()).then(data => {
        fetching = false;

        loadingIcon.remove();

        if (data.items) {
            next_page = data.metadata.nextPage;
            if (clear) {
                images = data.items;
            } else {
                images = images.concat(data.items);
            }

        }
        else if (data.images) {
            if (clear) {
                images = [];
            }
            data.images.forEach(image => {
                images.push(image.image);
            });
            var current_page = data.page_number;
            if (url.includes("?page=")) {
                url = url.replace("?page=" + current_page, "");

            } else if (url.includes("&page=")) {
                url = url.replace("&page=" + current_page, "");
            }
            next_page = url + "?page=" + (current_page + 1);
        }


       

        console.log(images);

        if (update) {
            UpdateShownImages();
        }
    });
}



async function UpdateShownImages() {



    images.forEach((image, index) => {
        const imageWrapper = document.createElement("div");
        imageWrapper.classList.add("mb-4", "rounded-lg", "border-blue-400", "z-[1]", "relative","imageWrapper","h-min","w-full");
        //random bg color
        imageWrapper.style.backgroundColor = "#" + Math.floor(Math.random() * 16777215).toString(16);
        

        var shortUrl = image.url.split("/width=")[0] + "/width=";
        


        const imageElement = document.createElement("img");
        imageElement.id = image.id;
        imageElement.classList.add("object-cover")
        imageElement.srcset =  `${shortUrl+240} 240w, ${shortUrl+512} 512w, ${shortUrl+768} 768w`



        imageElement.setAttribute("decoding", "async");
        imageElement.setAttribute("loading", "lazy");
        imageElement.setAttribute("width", image.width);
        imageElement.setAttribute("height", image.height);
        





        //if loading fails turn the imageelemnt to a video element
        imageElement.onerror = function () {
            imageElement.remove();
            
            const videoElement = document.createElement("video");
            videoElement.id = image.id;
            videoElement.src = image.url;
            videoElement.setAttribute("loading", "lazy");
            //videoElement.setAttribute("decoding", "async");
            videoElement.setAttribute("autoplay", "autoplay");
            videoElement.setAttribute("loop", "loop");
            videoElement.setAttribute("width", image.width);
            videoElement.setAttribute("height", image.height);
            videoElement.muted = true;
            videoElement.classList.add("h-auto", "max-w-full", "rounded-lg");
            imageWrapper.appendChild(videoElement);
            videoElement.onclick = function () {
                window.open("https://civitai.com/images/" + image.id, '_blank');
            };
            videoElement.onerror = function () {
                imageWrapper.remove();
            }


        };

        imageElement.classList.add("h-auto", "max-w-full", "rounded-lg");


        imageElement.addEventListener("click", () => {
            window.open("https://civitai.com/images/" + image.id, '_blank');
        });

        if (image.meta) {
            const infoIcon = document.createElement("i");
            infoIcon.classList.add("drop-shadow-lg", "fa-solid", "fa-circle-info", "text-white", "text-lg", "absolute", "bottom-2", "right-2");
            infoIcon.title = "View Metadata";
            infoIcon.style.cursor = "pointer";
            infoIcon.setAttribute('data-dropdown-toggle', 'metaDropdown');
            infoIcon.addEventListener('click', (e) => {
                UpdateMetaData(image.meta);
            });

            imageWrapper.appendChild(infoIcon);
        }

        const reactionDiv = document.createElement("div");
        //rounded transparent black background horizontal in left corner container
        reactionDiv.classList.add("absolute", "bottom-2", "left-2", "flex", "items-center", "rounded", "bg-black", "bg-opacity-50", "px-2", "py-0.5");

        var stats = image.stats;
        var likeCount = stats.heartCount + stats.likeCount + stats.laughCount

        if (likeCount > 0) {
            const heartIcon = document.createElement("i");
            heartIcon.classList.add("fa-solid", "fa-heart", "text-red-500", "text-base");
            reactionDiv.appendChild(heartIcon);
            const heartText = document.createElement("p");
            heartText.classList.add("text-white", "text-sm", "ml-1");
            heartText.textContent = likeCount
            reactionDiv.appendChild(heartText);
        }
        if (stats.commentCount > 0) {
            const commentIcon = document.createElement("i");
            commentIcon.classList.add("fa-solid", "fa-comment", "text-white", "text-base", "ml-2");
            reactionDiv.appendChild(commentIcon);
            const commentText = document.createElement("p");
            commentText.classList.add("text-white", "text-sm", "ml-1");
            commentText.textContent = stats.commentCount
            reactionDiv.appendChild(commentText);
        }
        imageWrapper.appendChild(reactionDiv);

        imageWrapper.appendChild(imageElement);
        document.getElementById("imageContainer").appendChild(imageWrapper);
    });
    initDropdowns();
}
function ReorderExistingImages(){
    //get all images
    var imageWrappers = document.querySelectorAll(".imageWrapper");
    console.log(imageWrappers);
    
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

    console.log(meta);

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

function UseMetaData(meta) {
    //get state
    var state = JSON.parse(localStorage.getItem("state"));

    state["prompt"] = meta.prompt;
    state["negativePrompt"] = meta.negativePrompt;
    state["sampler"] = meta.sampler;    
    state["cfg"] = meta.cfgScale;
    state["steps"] = meta.steps;
    state["seed"] = meta.seed;

    //save
    localStorage.setItem("state", JSON.stringify(state));
    document.getElementById("generateLink").click();

}

const nsfwSelect = document.getElementById("nsfwSelect");
const sortSelect = document.getElementById("sortSelect");
const periodSelect = document.getElementById("periodSelect");

const nsfw_levels = [
    "&nsfw=None",
    "&nsfw=Soft",
    "&nsfw=Mature",
    "&nsfw=X",
]

function UpdateImages() {
    var url = "https://civitai.com/api/v1/images";
    url += "?sort=" + sortSelect.value;
    url += "&period=" + periodSelect.value;
    url += nsfw_levels[nsfwSelect.selectedIndex];
    getImagesFromUrl(url, true, true)
}
nsfwSelect.addEventListener('change', () => {
    UpdateImages();
});
sortSelect.addEventListener('change', () => {
    UpdateImages();
});
periodSelect.addEventListener('change', () => {
    UpdateImages();
});



window.onscroll = function (ev) {
    var percentage = (window.innerHeight + window.scrollY) / document.body.offsetHeight;

    if (percentage > 0.85) {
        if (next_page) {
            getImagesFromUrl(next_page, false, true);
        }
    }
};


UpdateImages()
