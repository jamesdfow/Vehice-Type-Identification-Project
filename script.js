const webcam = document.getElementById("webcam");
const overlay = document.getElementById("overlay");
const ctx = overlay.getContext("2d");
const predictionLog = document.getElementById("predictionLog");

const webcamButton = document.getElementById("startCamera");
const trackingButton = document.getElementById("startTracking");

let model, maxPredictions;
let loopActive = false;
let webcamStream = null;

document.getElementById("loadModel").addEventListener("click", async () => {
  model = await tmImage.load("Models/model.json", "Models/metadata.json");
  maxPredictions = model.getTotalClasses();
  alert("✅ Model loaded!");
});

webcamButton.addEventListener("click", async () => {
  if (!webcamStream) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      webcam.srcObject = stream;
      webcamStream = stream;

      webcam.addEventListener("loadedmetadata", () => {
        overlay.width = webcam.videoWidth;
        overlay.height = webcam.videoHeight;
      });

      webcam.style.display = "block";
      overlay.style.display = "block";
      webcamButton.textContent = "Stop Camera";
    } catch (err) {
      alert("Could not start webcam.");
    }
  } else {
    webcamStream.getTracks().forEach(track => track.stop());
    webcam.srcObject = null;
    webcamStream = null;
    webcam.style.display = "none";
    overlay.style.display = "none";
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    webcamButton.textContent = "Start Camera";
  }
});

trackingButton.addEventListener("click", () => {
  if (!loopActive) {
    if (!model || !webcamStream) {
      alert("Make sure the camera is on and the model is loaded.");
      return;
    }

    loopActive = true;
    trackingButton.textContent = "Stop Tracking";
    trackingButton.classList.add("tracking-active");
    predict();
  } else {
    loopActive = false;
    trackingButton.textContent = "Start Tracking";
    trackingButton.classList.remove("tracking-active");
  }
});

let lastLoggedLabel = "";
let lastLoggedTime = 0;

async function predict() {
  while (loopActive) {
    const predictions = await model.predict(webcam);
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const top = predictions.reduce((max, curr) =>
      curr.probability > max.probability ? curr : max
    );

    drawLabel(top.className, top.probability);

    const now = Date.now();
    if (
      top.probability > 0.9 &&
      (top.className !== lastLoggedLabel || now - lastLoggedTime > 5000)
    ) {
      lastLoggedLabel = top.className;
      lastLoggedTime = now;
      captureSnapshot(top.className, top.probability);
      logPrediction(top.className, top.probability);
    }

    await new Promise(requestAnimationFrame);
  }

  ctx.clearRect(0, 0, overlay.width, overlay.height);
}

function drawLabel(label, prob) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(10, 10, 240, 40);
  ctx.fillStyle = "#fff";
  ctx.font = "16px sans-serif";
  ctx.fillText(`${label} (${(prob * 100).toFixed(1)}%)`, 20, 35);
}

function captureSnapshot(label, prob) {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = webcam.videoWidth;
  tempCanvas.height = webcam.videoHeight;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(webcam, 0, 0);

  const dataURL = tempCanvas.toDataURL("image/png");

  const container = document.createElement("div");
  container.className = "snapshot-entry";

  const img = document.createElement("img");
  img.src = dataURL;

  const info = document.createElement("div");
  info.innerHTML = `<strong>${label}</strong><br><small>${new Date().toLocaleTimeString()}</small>`;

  container.appendChild(img);
  container.appendChild(info);
  document.querySelector("#snapshotGallery .gallery").prepend(container);
}

function logPrediction(label, prob) {
  const li = document.createElement("li");
  li.textContent = `${label} – ${(prob * 100).toFixed(1)}%`;
  predictionLog.prepend(li);
  if (predictionLog.children.length > 10) {
    predictionLog.removeChild(predictionLog.lastChild);
  }
}

document.getElementById("clearGallery").addEventListener("click", () => {
  document.querySelector("#snapshotGallery .gallery").innerHTML = "";
  lastLoggedLabel = "";
  lastLoggedTime = 0;
});

document.getElementById("clearLog").addEventListener("click", () => {
  predictionLog.innerHTML = "";
});