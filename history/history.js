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
let entries = [];
let db = null;

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

        entries.push({ id});        

        imagesList.push({ imageUrl, text }); // Store both the image URL and text in the imagesList array
        cursor.continue();
      } else {
        console.log(imagesList);
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


async function removeFromIndexedDB(id) {
  try {
    if (!db) {
      db = await createIndexedDB();
    }else {
      const transaction = db.transaction(["images"], "readwrite");
      console.log("Delete "+ id +"->" + entries[id].id)
      const store = transaction.objectStore("images").delete(entries[id].id);

      // Reload images from IndexedDB after deletion and updating the object store
      await loadImagesFromIndexedDB();


    }




  } catch (error) {
    console.error("Error while removing image from IndexedDB:", error);
  }
}








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
    column.id = i;
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
    const imageWrapper = document.createElement("div");
    imageWrapper.classList.add("mb-4"); // Add margin bottom for spacing between images

    const imageElement = document.createElement("img");
    imageElement.id=i;
    imageElement.src = _imagesList[i].imageUrl; // Access the imageUrl from the object in imagesList
    imageElement.classList.add("h-auto", "max-w-full", "rounded-lg");

    // Add the click event listener to the image element
    imageElement.addEventListener("click", () => {
      // Access the associated text from the object in imagesList
      const text = _imagesList[i].text;
      // Pass the text to the updateFullscreenImage function
      updateFullscreenImage(_imagesList[i].imageUrl, text, _imagesList[i],i);
    });

    imageWrapper.appendChild(imageElement);

    columns[i % columCount].appendChild(imageWrapper); // Adding the image to the right column based on the remainder of the index divided by column count
  }
}

let currentEntry = null;
let currentID = 0;

function updateFullscreenImage(image, text, entry,id) {

  currentEntry = entry;
  currentID = id;

  document.getElementById("imageDetailToggle").click();

  console.log(text);

  document.getElementById("fullscreenImage").src = image;
  const info = document.getElementById("fullscreenInfo");

  if (text == "" || text == null) {
    info.innerHTML = "No Info";
    return;
  }

  words = ["Negative prompt", "Steps", "Sampler", "CFG scale", "Seed", "Size", "Model hash",
    "Model", "Denoising strength", "Clip skip", "ENSD", "TI hashes", "Version", "Lora hashes", "Ultimate SD upscale upscaler",
    "Ultimate SD upscale tile_width", "Ultimate SD upscale tile_height", "Ultimate SD upscale mask_blur", "Ultimate SD upscale padding",
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
  console.log("delete:" + currentID);
  removeFromIndexedDB(currentID);
  //loadImagesFromIndexedDB();
})
removeEntryById(57);

