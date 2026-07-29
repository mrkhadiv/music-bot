import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as https from "https";
import * as http from "http";
import type { TgBotInstance } from "./telegram-types";
import type { UserSession } from "./bot";
import NodeID3 from "node-id3";

const execAsync = promisify(exec);

function downloadFileFromUrl(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith("https") ? https : http;
    protocol
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            file.close();
            fs.unlinkSync(dest);
            downloadFileFromUrl(redirectUrl, dest).then(resolve).catch(reject);
            return;
          }
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlinkSync(dest);
        reject(err);
      });
  });
}

function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(":");
  const minutes = parseInt(parts[0], 10);
  const seconds = parseInt(parts[1], 10);
  return minutes * 60 + seconds;
}

export async function processAudioEdit(
  bot: TgBotInstance,
  chatId: number,
  userId: number,
  session: UserSession
): Promise<void> {
  const tmpDir = os.tmpdir();
  const workDir = path.join(tmpDir, `music_edit_${userId}_${Date.now()}`);
  fs.mkdirSync(workDir, { recursive: true });

  const inputFile = path.join(workDir, "input.mp3");
  const outputFile = path.join(workDir, "output.mp3");
  let coverFile: string | undefined;
  let coverSquare: string | undefined;
  let thumbFile: string | undefined;

  try {
    if (!session.fileId) throw new Error("No file ID");

    const fileLink = await bot.getFileLink(session.fileId);
    await downloadFileFromUrl(fileLink, inputFile);

    // Download and process cover if set
    if (session.coverFileId) {
      coverFile = path.join(workDir, "cover_original.jpg");
      coverSquare = path.join(workDir, "cover_square.jpg");
      thumbFile = path.join(workDir, "thumb.jpg");
      
      const coverLink = await bot.getFileLink(session.coverFileId);
      await downloadFileFromUrl(coverLink, coverFile);
      
      // Make cover 1:1 (square) - crop from center
      await execAsync(
        `ffmpeg -i "${coverFile}" -vf "crop='min(iw,ih)':'min(iw,ih)',scale=800:800" -q:v 2 "${coverSquare}" -y`
      );
      
      // Create thumbnail for Telegram (320x320)
      await execAsync(
        `ffmpeg -i "${coverSquare}" -vf "scale=320:320" -q:v 2 "${thumbFile}" -y`
      );
      
      // Use square cover from now on
      coverFile = coverSquare;
    }

    let currentInput = inputFile;

    // Step 1: Cut the audio if requested
    if (session.cutStart && session.cutEnd) {
      const cutOutput = path.join(workDir, "cut_output.mp3");
      const startSec = parseTimeToSeconds(session.cutStart);
      const endSec = parseTimeToSeconds(session.cutEnd);
      const duration = endSec - startSec;

      if (duration <= 0) {
        throw new Error("زمان پایان باید بعد از زمان شروع باشد!");
      }

      await execAsync(
        `ffmpeg -i "${currentInput}" -ss ${startSec} -t ${duration} -c:a libmp3lame -q:a 2 "${cutOutput}" -y`
      );
      currentInput = cutOutput;
    }

    // Step 2: Add cover art if provided using ffmpeg
    if (coverFile) {
      const coverOutput = path.join(workDir, "cover_output.mp3");
      await execAsync(
        `ffmpeg -i "${currentInput}" -i "${coverFile}" -map 0:a -map 1:0 -c:a copy -c:v mjpeg -id3v2_version 3 -metadata:s:v title="Album cover" -metadata:s:v comment="Cover (front)" "${coverOutput}" -y`
      );
      currentInput = coverOutput;
    }

    // Step 3: Update ID3 tags
    const tags: NodeID3.Tags = {};
    let needsTagUpdate = false;

    if (session.title) {
      tags.title = session.title;
      needsTagUpdate = true;
    }
    if (session.artist) {
      tags.artist = session.artist;
      needsTagUpdate = true;
    }
    if (session.album) {
      tags.album = session.album;
      needsTagUpdate = true;
    }
    if (session.year) {
      tags.year = session.year;
      needsTagUpdate = true;
    }

    // Copy to output file
    fs.copyFileSync(currentInput, outputFile);
    
    if (needsTagUpdate) {
      const result = NodeID3.update(tags, outputFile);
      if (result !== true && Buffer.isBuffer(result)) {
        fs.writeFileSync(outputFile, result);
      }
    }

    // Send the edited file back
    const outputFileName =
      session.title || session.fileName?.replace(/\.[^/.]+$/, "") || "edited";
    const performer = session.artist || undefined;
    const title = session.title || undefined;

    // Read files as buffers for sending
    const audioBuffer = fs.readFileSync(outputFile);
    
    // Prepare send options
    const sendOptions: Record<string, unknown> = {
      title: title,
      performer: performer,
      caption: "✅ فایل ویرایش شده آماده است!",
    };
    
    // Add thumbnail if cover was set (as buffer)
    if (thumbFile && fs.existsSync(thumbFile)) {
      const thumbBuffer = fs.readFileSync(thumbFile);
      sendOptions.thumb = thumbBuffer;
    }

    await bot.sendAudio(
      chatId,
      audioBuffer,
      sendOptions,
      {
        filename: `${outputFileName}.mp3`,
        contentType: "audio/mpeg",
      }
    );

    bot.sendMessage(
      chatId,
      "🎉 *ویرایش با موفقیت انجام شد!*\n\nبرای ویرایش فایل دیگه، یک فایل صوتی جدید ارسال کنید.",
      { parse_mode: "Markdown" }
    );
  } finally {
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}
