_path = window.location.toString();
console.log(_path);
document.getElementById("generateLink").href = _path.replace("/history/", "");

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
        const imageStore = db.createObjectStore("images", { keyPath: "id", autoIncrement: true });
        imageStore.createIndex("imageUrl", "imageUrl", { unique: true }); // Create an index on imageUrl field
      }
    };
  });
}
let imagesList = [];
let favorite_images = [124];
let entries = [];
let db = null;
let selectedImages = [];

async function loadImagesFromIndexedDB() {
  try {
    db = await createIndexedDB();

    const transaction = db.transaction(["images"], "readonly");
    const store = transaction.objectStore("images");

    imagesList = []; // Clear the imagesList before loading new images
    entries = []; // Clear the entries array before loading new images

    store.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        console.log(cursor.value.imageUrl);
        const imageBlob = cursor.value.imageBlob;

        const imageUrl = URL.createObjectURL(imageBlob);

        const text = cursor.value.text; // Get the associated text from the stored object

        const timestamp = cursor.value.timestamp;

        const id = cursor.primaryKey

        entries.push({ id });

        imagesList.push({ imageUrl, text, id, imageBlob }); // Store both the image URL and text in the imagesList array
        cursor.continue();
      } else {
        console.log(entries);
        imagesList = imagesList.filter((entry) => entry !== undefined); // Filter out undefined entries

        imagesList = imagesList.reverse();
        entries = entries.reverse();
        UpdateImagePlacement();
      }
    };
  } catch (error) {
    console.error("Error while loading images from IndexedDB:", error);
  }
}
async function removeFromIndexedDB(_id, isIndex = true, refresh = true) {
  try {
    if (!db) {
      db = await createIndexedDB();
    } else {
      const transaction = db.transaction(["images"], "readwrite");

      var id
      if (isIndex) {
        console.log("Delete " + _id + "->" + entries[id].id)
        id = entries[_id].id;
      } else {
        id = _id;
      }

      const store = transaction.objectStore("images").delete(id);

      if (refresh) {
        loadImagesFromIndexedDB();
      }


    }




  } catch (error) {
    console.error("Error while removing image from IndexedDB:", error);
  }
}



const fullStarIcon = '<i class="fa-solid fa-star shadow-2xl p-2"></i>';
const emptyStarIcon = '<i class="fa-regular fa-star drop-shadow-2xl p-2"></i>';




function UpdateImagePlacement(searchTerm = "") {

  const imageContainer = document.getElementById("imageContainer");
  imageContainer.innerHTML = "";

  //Determine the number of columns based on the container's width
  const containerWidth = imageContainer.clientWidth;
  const imageWidth = 240; // Adjust this value based on the desired image width
  const columCount = Math.max(1, Math.floor(containerWidth / imageWidth));
  //const columCount = 4;

  let columns = [];

  const columnWidth = 100 / columCount; // Set the width for each column

  for (let i = 0; i < columCount; i++) {
    const column = document.createElement("div");
    column.id = 1;
    column.classList.add("gap-4");
    column.style.width = `${columnWidth}%`; // Set the width of each column
    imageContainer.appendChild(column);
    columns.push(column);
  }

  let _imagesList = imagesList;

  if (searchTerm && searchTerm !== "") {
    // Perform search only if searchTerm is not empty or null
    const lowerCaseSearchTerm = searchTerm.trim().toLowerCase();

    _imagesList = _imagesList.filter((image) => {
      const lowerCaseText = image.text ? image.text.toLowerCase() : ""; // Make text lowercase if it exists, otherwise use an empty string

      // Check if the lowerCaseText includes the lowerCaseSearchTerm
      return lowerCaseText.includes(lowerCaseSearchTerm);
    });
  }




  for (let i = 0; i < _imagesList.length; i++) {

    const id = entries[i].id;

    const imageWrapper = document.createElement("div");
    imageWrapper.classList.add("mb-4", "rounded-lg", "border-blue-400","z-[1]","relative"); // Add margin bottom for spacing between images
    imageWrapper.id = "img-" + id;

    const imageElement = document.createElement("img");
    imageElement.id = id;
    imageElement.src = _imagesList[i].imageUrl; // Access the imageUrl from the object in imagesList
    imageElement.classList.add("h-auto", "max-w-full", "rounded-lg");

    // Add the click event listener to the image element
    imageElement.addEventListener("click", () => {

      //check if control is pressed
      if (event.ctrlKey) {
        //prevent default behavior
        event.preventDefault();
        SelectImage(i);

        return;
      }
      // Access the associated text from the object in imagesList
      const text = _imagesList[i].text;
      // Pass the text to the updateFullscreenImage function
      updateFullscreenImage(_imagesList[i].imageUrl, text, _imagesList[i], i);
    });

    imageWrapper.appendChild(imageElement);

    //favorite button
    const favoriteBtn = document.createElement("button");
    favoriteBtn.classList.add("absolute", "bottom-0", "left-0",  "text-yellow-500","hidden","drop-shadow-2xl","text-lg");
    favoriteBtn.innerHTML = emptyStarIcon;
    
    imageWrapper.addEventListener("mouseover", () => {
      if(isFavorited(id)){
        return;
      }

      favoriteBtn.classList.remove("hidden");
    });
    imageWrapper.addEventListener("mouseout", () => {
      if(isFavorited(id)){
        return;
      }
      favoriteBtn.classList.add("hidden");
    });

    favoriteBtn.addEventListener("click", () => {
      FavoriteImage(id);
    });

    imageWrapper.appendChild(favoriteBtn);

    columns[i % columCount].appendChild(imageWrapper); // Adding the image to the right column based on the remainder of the index divided by column count
  }
  RefreshFavorites();
  RefreshSelection();
}

function FavoriteImage(_id) {
  if (favorite_images.includes(_id)) {
    favorite_images = favorite_images.filter((entry) => entry !== _id);
  } else {
    favorite_images.push(_id);
  }
  RefreshFavorites();
}
function isFavorited(_id) {
  return favorite_images.includes(_id);
}
function RefreshFavorites(){
  const images = document.querySelectorAll("img");
  images.forEach(img => {

    const button = img.parentElement.querySelector("button");

    if(!button)
      return;

    if (isFavorited(parseInt(img.id))) {
      button.innerHTML = fullStarIcon;
      button.classList.remove("hidden");
      console.log(button);
    } else {
      button.innerHTML = emptyStarIcon;
      button.classList.add("hidden");

    }
  });
}

function SelectImage(_id) {
  const id = entries[_id].id;
  if (selectedImages.includes(id)) {
    selectedImages = selectedImages.filter((entry) => entry !== id);
  } else {
    selectedImages.push(id);
  }

  console.log(selectedImages);

  RefreshSelection();
}

const SelectionHeader = document.getElementById("SelectionHeader");
const selectionText = document.getElementById("selectionText");
const cancelSeletionBtn = document.getElementById("cancelSeletionBtn");

function RefreshSelection() {

  if (selectedImages.length == 0) {
    SelectionHeader.classList.add("hidden");
  } else {
    SelectionHeader.classList.remove("hidden");
  }
  selectionText.textContent = selectedImages.length + " selected";

  const images = document.querySelectorAll("img");
  images.forEach(img => {
    if (selectedImages.includes(parseInt(img.id))) {
      img.parentElement.classList.add("border-4");
    } else {
      img.parentElement.classList.remove("border-4");
    }
  });
}



let currentEntry = null;
let currentID = 0;
let currentText = ""
let currentImage = "";

function updateFullscreenImage(image, text, entry, id) {

  currentEntry = entry;
  currentID = id;
  currentText = text;
  currentImage = image;

  document.getElementById("ImageDetailModal").classList.remove("hidden");

  console.log(text);

  document.getElementById("fullscreenImage").src = image;
  const info = document.getElementById("fullscreenInfo");

  if (text == "" || text == null) {
    info.innerHTML = "No Info";
    return;
  }

  words = ["Negative prompt", "Steps", "Sampler", "CFG scale", "Seed", "Size", "Model hash",
    "Model", "Denoising strength", "Clip skip", "ENSD", "TI hashes", "Version", "Lora hashes", "Ultimate SD upscale upscaler",
    "Ultimate SD upscale tile_width", "Ultimate SD upscale tile_height", "Ultimate SD upscale mask_blur", "Ultimate SD upscale padding", "Worker", "Id"
  ];

  info.innerHTML = boldWords("<strong>Prompt</strong>:" + text, words);


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
const blobToBase64 = async blobUrl => {
  // Fetch the data from the URL
  const response = await fetch(blobUrl);
  const blob = await response.blob();

  // Convert the Blob to base64
  const reader = new FileReader();
  reader.readAsDataURL(blob);

  return new Promise(resolve => {
    reader.onloadend = () => {
      resolve(reader.result);
    };
  });
};

function ReUse() {

  blobToBase64(currentImage).then(base64 => {

    let state = JSON.parse(localStorage.getItem("state"));

    state["generatedImage"] = base64;
    state["prompt"] = currentText.split("Negative prompt")[0];
    state["negativePrompt"] = currentText.split("Negative prompt:")[1].split("Steps")[0];
    state["steps"] = extractValueFromText(currentText, "Steps");
    state["sampler"] = extractValueFromText(currentText, "Sampler");
    state["cfg"] = extractValueFromText(currentText, "CFG scale");
    state["seed"] = extractValueFromText(currentText, "Seed");
    let size = extractValueFromText(currentText, "Size");
    state["width"] = size.split("x")[0];
    state["height"] = size.split("x")[1];

    localStorage.setItem("state", JSON.stringify(state));
    document.getElementById("generateLink").click();
  })
}

// Function to extract a section of text based on a label
function extractValueFromText(text, keyword) {
  const pattern = new RegExp(`${keyword}:\\s*((?:[^,]|\\(.*?\\))+)`);
  const match = text.match(pattern);

  if (match && match[1]) {
    return match[1].trim();
  }

  return null;
}



// Call the function to load images from IndexedDB on page load
loadImagesFromIndexedDB();
window.addEventListener("resize", () => {
  UpdateImagePlacement("");
});

document.getElementById("searchInput").addEventListener("input", (e) => {
  UpdateImagePlacement(e.target.value);
});

document.getElementById("deleteBtn").addEventListener("click", () => {
  console.log(db);
  document.getElementById("ImageDetailModal").classList.add("hidden");
  document.getElementById("img-" + entries[currentID].id).remove();
  removeFromIndexedDB(currentID);

  //loadImagesFromIndexedDB();
})
document.getElementById("reuseBtn").addEventListener("click", () => {
  ReUse();
})

document.getElementById("close-modal").addEventListener("click", () => {
  document.getElementById("ImageDetailModal").classList.add("hidden");
})
document.getElementById("close-modal2").addEventListener("click", () => {
  document.getElementById("ImageDetailModal").classList.add("hidden");
})
// on ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.getElementById("ImageDetailModal").classList.add("hidden");
  }
});
// On Left/Right
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") {
    if (currentID > 0) {
      currentID--;
      updateFullscreenImage(imagesList[currentID].imageUrl, imagesList[currentID].text, imagesList[currentID], currentID);
    }
  }
  if (e.key === "ArrowRight") {
    if (currentID < imagesList.length - 1) {
      currentID++;
      updateFullscreenImage(imagesList[currentID].imageUrl, imagesList[currentID].text, imagesList[currentID], currentID);
    }
  }
});

cancelSeletionBtn.addEventListener("click", () => {
  selectedImages = [];
  RefreshSelection();
});

//onclick
window.addEventListener("click", (e) => {
  //log what was clicked
  console.log(e.target);

  //if it is not the modal or a child of the modal, close it
  if (e.target === document.getElementById("ImageDetailModal")) {
    document.getElementById("ImageDetailModal").classList.add("hidden");
  }
});
//on ctrl + a
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "a") {
    e.preventDefault();

    if (selectedImages.length == entries.length) {
      selectedImages = [];
      RefreshSelection();
      return;
    }

    selectedImages = [];



    const images = document.querySelectorAll("img");
    images.forEach((img, index) => {
      //check if id is int
      if (parseInt(img.id))
        selectedImages.push(parseInt(img.id));
    });
    RefreshSelection();
  }
});

function getImageEntryById(id) {
  return imagesList.find((entry) => entry.id === id);
}

document.getElementById("downloadSelectedBtn").addEventListener("click", () => {

  var links = []

  selectedImages.forEach(imageID => {
    links.push(getImageEntryById(imageID).imageBlob)
  });
  console.log(links);

  downloadZip(links);
});

document.getElementById("deleteSelectedBtn").addEventListener("click", () => {

  if (confirm("Are you sure you want to delete " + selectedImages.length + " images?") == false)
    return;

  document.getElementById("ImageDetailModal").classList.add("hidden");

  selectedImages.forEach(image => {
    removeFromIndexedDB(image, false, false);
  });
  loadImagesFromIndexedDB();
  selectedImages = [];
  RefreshSelection();

});
document.getElementById("favoriteSelectedBtn").addEventListener("click", () => {
      
    selectedImages.forEach(image => {
      if(!favorite_images.includes(image))
        favorite_images.push(image);
    });
    RefreshFavorites();

    selectedImages = [];
    RefreshSelection();
});
document.getElementById("unfavoriteSelectedBtn").addEventListener("click", () => {
        
    selectedImages.forEach(image => {
      favorite_images = favorite_images.filter((entry) => entry !== image);
    });
    RefreshFavorites();


    selectedImages = [];
    RefreshSelection();
});

async function downloadZip(links) {
  const zip = new JSZip();



  const progressBar = document.getElementById("DownloadProgressBar");
  const Progress = document.getElementById("DownloadProgress");

  // Set up a progress callback


  progressBar.classList.remove("hidden");

  const total = links.length;

  // Fetch and add each image to the zip file
  for (let i = 0; i < links.length; i++) {
    zip.file(`image_${i + 1}.png`, links[i]);
  }

  // Generate the zip file
  zip.generateAsync({ type: 'blob' }, (metadata) => {
    if (metadata.percent) {
      console.log(`Progression: ${metadata.percent.toFixed(2)}%`);
      Progress.style.width = `${metadata.percent}%`;
    }
  }).then((content) => {
    // Save and trigger the download
    saveAs(content, 'images.zip');
    progressBar.classList.add("hidden");
  });
}


function save(){
  //save favorite_images to browser storage
  localStorage.setItem("favorite_images", JSON.stringify(favorite_images));
}
function Load(){
  //load favorite_images from browser storage
  favorite_images = JSON.parse(localStorage.getItem("favorite_images"));
  if(!favorite_images)
    favorite_images = [];
  RefreshFavorites();
}
window.addEventListener("beforeunload", save);
window.addEventListener("load", Load);
