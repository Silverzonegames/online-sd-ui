const widthSlider = document.getElementById("width-slider");
const heightSlider = document.getElementById("height-slider");

const widthText = document.getElementById("widthText");
const heightText = document.getElementById("heightText");

// Event listener for batch size slider change
const batchSizeSlider = document.getElementById('batchSizeSlider');
const batchSizeValue = document.getElementById('batchSizeValue');

const downloadBtn = document.getElementById("downloadBtn");

const promptField = document.getElementById('prompt');
const negativePromptField = document.getElementById('negativePrompt');

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
let currentLoraInfo = "";

let currentCategory = "All";
let currentSubCategory = "";
let subCategory = 1;

let generatingAmount = 0;

let url = urlInput.value

const ServerType = {
  Automatic1111: "Automatic1111",
  ComfyUI: "ComfyUI", //WIP
  Horde: "Horde", //TODO
}
let serverType = ServerType.Automatic1111;

let installDir = "";

let controlNetModel = "control_v11p_sd15_inpaint_fp16 [be8bc0ed]";
let controlnetModels = [];


_link = window.location.pathname.replace("index.html","") +"history/";

document.getElementById("historyLink").href = _link;
console.log("Link: " + _link);

class LoraData {
    name = "";
    alias = "";
    path = "";
    image = "";
    category = "";
    config = "";
    isLyco = false;
    isHypernet = false;
    metadata = {}
    constructor(name, alias, path, image, category, config, isLyco, isHypernet = false, metadata = {}) {
      this.name = name;
      this.alias = alias;
      this.path = path;
      this.image = image;
      this.category = category;
      this.config = config;
      this.isLyco = isLyco;
      this.isHypernet = isHypernet;
      this.metadata = metadata;
    }
  }