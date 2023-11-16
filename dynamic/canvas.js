(function () {
  var $ = function (id) { return document.getElementById(id) };

  var canvas = this.__canvas = new fabric.Canvas('canvas', {
    isDrawingMode: true,
    backgroundColor: 'rgb(255,255,255)'
  });
  canvas.on("mouse:up", Generate);
  canvas.setDimensions({ width: 512, height: 512 });

  fabric.Object.prototype.transparentCorners = false;

  var
    drawingOptionsEl = $('drawing-mode-options'),
    drawingColorEl = $('drawing-color'),
    drawingLineWidthEl = $('drawing-line-width'),
    clearEl = $('clear-canvas');

  clearEl.onclick = function () {
    canvas.clear()
    canvas.backgroundColor = 'rgb(255,255,255)';
    canvas.renderAll();
  };


  var currentTool = "brush";
  const tools = [
    "select",
    "brush",
    "spray",
    "square",
    "circle",
  ]


  $("select").onclick = function () {
    canvas.isDrawingMode = false;
    changeTool("select");
  };
  $("brush").onclick = function () {
    canvas.freeDrawingBrush = new fabric['PencilBrush'](canvas);
    canvas.isDrawingMode = true;
    changeTool("brush");
  };
  $("spray").onclick = function () {
    canvas.freeDrawingBrush = new fabric['SprayBrush'](canvas);
    canvas.isDrawingMode = true;
    changeTool("spray");
  };

  function changeTool(tool) {
    currentTool = tool;
    tools.forEach((tool) => {
      $(tool).classList.remove("bg-blue-600");
      $(tool).classList.add("bg-gray-900");
    });
    $(tool).classList.remove("bg-gray-900");
    $(tool).classList.add("bg-blue-600");

    if (canvas.freeDrawingBrush) {
      var brush = canvas.freeDrawingBrush;
      brush.color = drawingColorEl.value;
      if (brush.getPatternSrc) {
        brush.source = brush.getPatternSrc.call(brush);
      }
      brush.width = parseInt(drawingLineWidthEl.value, 10) || 1;
    }
  }


  if (fabric.PatternBrush) {
    var vLinePatternBrush = new fabric.PatternBrush(canvas);
    vLinePatternBrush.getPatternSrc = function () {

      var patternCanvas = fabric.document.createElement('canvas');
      patternCanvas.width = patternCanvas.height = 10;
      var ctx = patternCanvas.getContext('2d');

      ctx.strokeStyle = this.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.lineTo(10, 5);
      ctx.closePath();
      ctx.stroke();

      return patternCanvas;
    };

    var hLinePatternBrush = new fabric.PatternBrush(canvas);
    hLinePatternBrush.getPatternSrc = function () {

      var patternCanvas = fabric.document.createElement('canvas');
      patternCanvas.width = patternCanvas.height = 10;
      var ctx = patternCanvas.getContext('2d');

      ctx.strokeStyle = this.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.lineTo(5, 10);
      ctx.closePath();
      ctx.stroke();

      return patternCanvas;
    };

    var squarePatternBrush = new fabric.PatternBrush(canvas);
    squarePatternBrush.getPatternSrc = function () {

      var squareWidth = 10, squareDistance = 2;

      var patternCanvas = fabric.document.createElement('canvas');
      patternCanvas.width = patternCanvas.height = squareWidth + squareDistance;
      var ctx = patternCanvas.getContext('2d');

      ctx.fillStyle = this.color;
      ctx.fillRect(0, 0, squareWidth, squareWidth);

      return patternCanvas;
    };

    var diamondPatternBrush = new fabric.PatternBrush(canvas);
    diamondPatternBrush.getPatternSrc = function () {

      var squareWidth = 10, squareDistance = 5;
      var patternCanvas = fabric.document.createElement('canvas');
      var rect = new fabric.Rect({
        width: squareWidth,
        height: squareWidth,
        angle: 45,
        fill: this.color
      });

      var canvasWidth = rect.getBoundingRect().width;

      patternCanvas.width = patternCanvas.height = canvasWidth + squareDistance;
      rect.set({ left: canvasWidth / 2, top: canvasWidth / 2 });

      var ctx = patternCanvas.getContext('2d');
      rect.render(ctx);

      return patternCanvas;
    };


  }





  drawingLineWidthEl.onchange = function () {
    canvas.freeDrawingBrush.width = parseInt(this.value, 10) || 1;
    this.previousSibling.innerHTML = this.value;
  };

  drawingColorEl.onchange = function () {
    canvas.freeDrawingBrush.color = this.value;
  }

  if (canvas.freeDrawingBrush) {
    canvas.freeDrawingBrush.color = drawingColorEl.value;
    canvas.freeDrawingBrush.width = parseInt(drawingLineWidthEl.value, 10) || 1;

  }


  canvas.on('object:added', function () {
    if (!isRedoing) {
      h = [];
    }
    isRedoing = false;
  });

  $("undo").onclick = undo;
  $("redo").onclick = redo;

  document.onkeydown = function (e) {
    //ctrl+z
    if (e.ctrlKey && e.keyCode == 90) {
      undo();
    }
    if (e.ctrlKey && e.keyCode == 89) {
      redo();
    }
    //Del
    if (e.keyCode == 46) {
      canvas.remove(canvas.getActiveObject());
    }
  }


  var isRedoing = false;
  var h = [];
  function undo() {
    if (canvas._objects.length > 0) {
      h.push(canvas._objects.pop());
      canvas.renderAll();
      Generate();
    }
  }
  function redo() {

    if (h.length > 0) {
      isRedoing = true;
      canvas.add(h.pop());
      Generate();
    }
  }

  document.getElementById('upload').onchange = function handleImage(e) {
    var reader = new FileReader();
    reader.onload = function (event) {
      var imgObj = new Image();
      imgObj.src = event.target.result;
      imgObj.onload = function () {


        var image = new fabric.Image(imgObj);
        image.set({
          angle: 0,
          padding: 10,
          cornersize: 10,
        });
        canvas.centerObject(image);
        canvas.add(image);


        canvas.renderAll();
      }
    }
    reader.readAsDataURL(e.target.files[0]);
  }

})();
