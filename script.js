// === DOM References ===
const webcam = document.getElementById("webcam");
const overlay = document.getElementById("overlay");
const ctx = overlay.getContext("2d");
const predictionLog = document.getElementById("predictionLog");

// === Model Variables ===
let model, maxPredictions;
const modelURL = "Models/";
let loopActive = false;

const trackingButton = document.getElementById("startTracking");

// Toggle object tracking
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

// === Load Teachable Machine Model ===
document.getElementById("loadModel").addEventListener("click", async () => {
  model = await tmImage.load(
    modelURL + "model.json",
    modelURL + "metadata.json"
  );
  maxPredictions = model.getTotalClasses();
  alert("✅ Model loaded!");
});

// === Start Webcam ===
const webcamButton = document.getElementById("startCamera");
let webcamStream = null;

webcamButton.addEventListener("click", async () => {
  if (!webcamStream) {
    // Start the camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      webcam.srcObject = stream;
      webcamStream = stream;

      webcam.addEventListener("loadedmetadata", () => {
        overlay.width = webcam.videoWidth;
        overlay.height = webcam.videoHeight;
      });

      webcamButton.textContent = "Stop Camera";
    } catch (err) {
      console.error("Error accessing webcam:", err);
      alert("Could not start webcam.");
    }
  } else {
    // Stop the camera
    webcamStream.getTracks().forEach(track => track.stop());
    webcam.srcObject = null;
    webcamStream = null;

    // Optionally clear the canvas overlay too
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    webcamButton.textContent = "Start Camera";
  }
});

// === Main Prediction Function ===
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
    }

    // Wait until next frame
    await new Promise(requestAnimationFrame);
  }

  // Optionally clear the overlay when tracking stops
  ctx.clearRect(0, 0, overlay.width, overlay.height);
}

function captureSnapshot(label, prob) {
  // Create a canvas copy
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = webcam.videoWidth;
  tempCanvas.height = webcam.videoHeight;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(webcam, 0, 0);

  // Convert canvas to image
  const dataURL = tempCanvas.toDataURL("image/png");

  // Create a snapshot element
  const container = document.createElement("div");
  container.className = "snapshot-entry";

  const img = document.createElement("img");
  img.src = dataURL;

  const info = document.createElement("div");
  info.innerHTML = `<strong>${label}</strong><br><small>${new Date().toLocaleTimeString()}</small>`;

  container.appendChild(img);
  container.appendChild(info);

  // Add to gallery
  document.querySelector("#snapshotGallery .gallery").prepend(container);
}

// === Draw Label on Canvas ===
function drawLabel(label, prob) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(10, 10, 240, 40);
  ctx.fillStyle = "#fff";
  ctx.font = "16px sans-serif";
  ctx.fillText(`${label} (${(prob * 100).toFixed(1)}%)`, 20, 35);
}

// === Update Prediction Log ===
function logPrediction(label, prob) {
  const li = document.createElement("li");
  li.textContent = `${label} – ${(prob * 100).toFixed(1)}%`;
  predictionLog.prepend(li);

  // Keep log to 10 items
  if (predictionLog.children.length > 10) {
    predictionLog.removeChild(predictionLog.lastChild);
  }
}

document.getElementById("clearGallery").addEventListener("click", () => {
  const gallery = document.querySelector("#snapshotGallery .gallery");
  gallery.innerHTML = ""; // Wipes all snapshots
  lastLoggedLabel = "";   // Reset to allow new detections
  lastLoggedTime = 0;
});