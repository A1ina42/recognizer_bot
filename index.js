const { Telegraf } = require('telegraf');
const textToSpeech = require('@google-cloud/text-to-speech');
const speech = require('@google-cloud/speech');
require("dotenv").config();
const fs = require('fs')
const request = require('request')

const bot = new Telegraf(process.env.BOT_TOKEN);
const clientText = new textToSpeech.TextToSpeechClient();
const clientSpeech = new speech.SpeechClient();

bot.launch();

bot.start(async(ctx) => {
    ctx.reply("Добро пожаловать!");
});

// Распознавание текста
bot.on("text", async(ctx) => {
    try {
        const [response] = await clientText.synthesizeSpeech({
            input: {text: ctx.message.text},
            voice: {languageCode: 'ru-RU', ssmlGender: 'NEUTRAL'},
            audioConfig: {audioEncoding: 'MP3'},
        });
        return ctx.replyWithVoice({ source: response.audioContent })
    }
    catch(err) {
        console.log(err);
    }
})

// Распознавание голосовых сообщений
bot.on("voice", async(ctx) => {
    try {
        const url = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
        let fileName = ctx.message.voice.file_unique_id + '.oga';
        getMessage(url.href, fileName).then((response) => {
            if (response) return ctx.reply(response)
            else return ctx.reply("Не распознано")
        })
    }
    catch(err) {
        console.log(err);
    }
});

// Распознавание голосового сообщения
const getMessage = async (uri, fileName) => {
    const content = await getAudioBytes(uri, fileName);
    const [ response ] = await clientSpeech.recognize({
        audio: {
            content
          },
          config: {
            encoding: 'OGG_OPUS',
            sampleRateHertz: 48000,
            languageCode: 'ru-RU'
          }
    })
    console.log(response)
    return response.results.map(result => result.alternatives[0].transcript).join('\n');
}

// Кодирование голосового сообщения
const getAudioBytes = async(uri, fileName) => {
    return await new Promise((resolve, reject) => {
         request({ uri })
        .pipe(fs.createWriteStream(fileName))
        .on('finish', () => {
            console.log("Файл сохранен")
            const file = fs.readFileSync(fileName);
            const audioBytes = file.toString('base64');
            fs.unlink(fileName, () => {});  // Удаление файла после кодировки
            console.log("Файл удален");
            resolve(audioBytes);
        })
        .on('error', (error) => {
            reject(error);
        })
    })
};

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

