const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const videoFolder = './video_res';
const subtitleFolder = './subtitle_res';

fs.readdir(videoFolder, (err, files) => {
    if(err) {
        console.error(err);
        return;
    }

    const videoFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.mp4', '.mkv', 'avi', '.mov'].includes(ext)
    })

    videoFiles.forEach(videoFile => {
        const inputFilePath = path.join(videoFolder,videoFile);
        const outputFilePath = path.join(subtitleFolder,`${path.basename(videoFile, path.extname(videoFile))}.ass`);
        

        const command = `ffmpeg -i "${inputFilePath}" -map 0:s:0 -c:s copy "${outputFilePath}"`;

        exec(command, (err, stdout, stderr) => {
            if(err){
                console.error(`处理文件${inputFilePath}出错: `, err.message);
                return;
            }
            console.log(`字幕已导出: ${outputFilePath}`)
        })
    })
})