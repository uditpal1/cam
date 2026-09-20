/*
========================================================
TELEGRAM BOT WEBHOOK
========================================================

Telegram:

/start

receive hone par bot user ko camera website ka
personalized link bhejega.

Example:

https://your-project.vercel.app/?chat_id=123456789
*/

const BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN;


/*
  Vercel website URL environment variable.
*/
const SITE_URL =
  process.env.SITE_URL;


/*
========================================================
SEND TELEGRAM MESSAGE
========================================================
*/

async function sendMessage(

  chatId,
  text

) {

  const url =

    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;


  const response =

    await fetch(

      url,

      {

        method: "POST",

        headers: {

          "Content-Type":
            "application/json"

        },

        body: JSON.stringify({

          chat_id:
            chatId,

          text:
            text,

          disable_web_page_preview:
            true

        })

      }

    );


  return response.json();

}


/*
========================================================
BOT WEBHOOK
========================================================
*/

export default async function handler(

  req,
  res

) {

  if (
    req.method !== "POST"
  ) {

    return res
      .status(405)
      .json({

        ok: false

      });

  }


  try {

    const update =
      req.body;


    /*
      Telegram message extract.
    */
    const message =
      update?.message;


    if (!message) {

      return res
        .status(200)
        .json({

          ok: true

        });

    }


    const chatId =
      message.chat.id;


    const text =
      message.text || "";


    /*
      /start command.
    */
    if (
      text.startsWith("/start")
    ) {

      /*
        Demo ke liye actual chat_id URL me visible hai.
      */
      const cameraLink =

        `${SITE_URL}/?chat_id=${encodeURIComponent(chatId)}`;


      const reply =

`Camera Demo

Please open your personalized camera link:

${cameraLink}

The page will request camera permission first. After permission is granted, you must press Start Capture. A maximum of 3 photos will be captured.`;


      await sendMessage(

        chatId,

        reply

      );

    }


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

        ok: false

      });

  }

}
