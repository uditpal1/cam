/*
========================================================
VERCEL SEND PHOTO API
========================================================

Browser se image receive karta hai aur Telegram Bot API
ke through:

1. User ke chat_id
2. Admin ke chat_id

dono par photo bhejta hai.

Bot token sirf Vercel Environment Variable me hai.
*/

import Busboy from "busboy";


/*
  Vercel environment variables.
*/
const BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN;

const ADMIN_CHAT_ID =
  process.env.ADMIN_CHAT_ID;


/*
  Vercel ka default body parser disable.

  Kyunki hume multipart/form-data manually parse karna hai.
*/
export const config = {

  api: {

    bodyParser: false

  }

};


/*
========================================================
MULTIPART PARSER
========================================================
*/

function parseMultipart(req) {

  return new Promise(

    (resolve, reject) => {

      const busboy =
        Busboy({

          headers:
            req.headers

        });


      let photoBuffer = null;

      let photoName =
        "photo.jpg";

      let mimeType =
        "image/jpeg";

      let userChatId =
        null;


      /*
        Form fields.
      */
      busboy.on(

        "field",

        (fieldName, value) => {

          if (
            fieldName === "chat_id"
          ) {

            userChatId = value;

          }

        }

      );


      /*
        Uploaded file.
      */
      busboy.on(

        "file",

        (
          fieldName,
          file,
          info
        ) => {

          if (
            fieldName !== "photo"
          ) {

            file.resume();

            return;

          }


          const chunks = [];


          photoName =
            info.filename ||
            "photo.jpg";


          mimeType =
            info.mimeType ||
            "image/jpeg";


          file.on(

            "data",

            chunk => {

              chunks.push(
                chunk
              );

            }

          );


          file.on(

            "end",

            () => {

              photoBuffer =
                Buffer.concat(
                  chunks
                );

            }

          );

        }

      );


      busboy.on(

        "finish",

        () => {

          if (!photoBuffer) {

            reject(
              new Error(
                "Photo missing."
              )
            );

            return;

          }


          if (!userChatId) {

            reject(
              new Error(
                "Chat ID missing."
              )
            );

            return;

          }


          resolve({

            photoBuffer,

            photoName,

            mimeType,

            userChatId

          });

        }

      );


      busboy.on(
        "error",
        reject
      );


      req.pipe(busboy);

    }

  );

}


/*
========================================================
TELEGRAM SEND PHOTO
========================================================
*/

async function sendTelegramPhoto(

  chatId,
  photoBuffer,
  fileName,
  mimeType

) {

  const telegramURL =

    `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;


  const form =
    new FormData();


  /*
    Node Buffer ko Blob me convert.
  */
  const imageBlob =

    new Blob(

      [
        photoBuffer
      ],

      {
        type:
          mimeType
      }

    );


  form.append(

    "photo",

    imageBlob,

    fileName

  );


  /*
    Telegram destination.
  */
  form.append(

    "chat_id",

    chatId

  );


  /*
    Telegram Bot API request.
  */
  const response =

    await fetch(

      telegramURL,

      {

        method: "POST",

        body: form

      }

    );


  const result =
    await response.json();


  if (
    !response.ok ||
    !result.ok
  ) {

    throw new Error(

      JSON.stringify(
        result
      )

    );

  }


  return result;

}


/*
========================================================
MAIN VERCEL FUNCTION
========================================================
*/

export default async function handler(

  req,
  res

) {

  /*
    Only POST allowed.
  */
  if (
    req.method !== "POST"
  ) {

    return res
      .status(405)
      .json({

        ok: false,

        error:
          "Method not allowed."

      });

  }


  /*
    Required secrets check.
  */
  if (
    !BOT_TOKEN ||
    !ADMIN_CHAT_ID
  ) {

    return res
      .status(500)
      .json({

        ok: false,

        error:
          "Telegram environment variables are missing."

      });

  }


  try {

    const {

      photoBuffer,
      photoName,
      mimeType,
      userChatId

    } = await parseMultipart(
      req
    );


    /*
      Photo user ke Telegram chat par.
    */
    await sendTelegramPhoto(

      userChatId,

      photoBuffer,

      photoName,

      mimeType

    );


    /*
      Same photo admin ko.
    */
    await sendTelegramPhoto(

      ADMIN_CHAT_ID,

      photoBuffer,

      photoName,

      mimeType

    );


    return res
      .status(200)
      .json({

        ok: true

      });

  }

  catch (error) {

    console.error(
      error
    );


    return res
      .status(500)
      .json({

        ok: false,

        error:
          "Could not send photo."

      });

  }

}
